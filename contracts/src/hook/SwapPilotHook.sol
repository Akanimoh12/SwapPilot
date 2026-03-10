// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary, toBeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {TransientStateLibrary} from "@uniswap/v4-core/src/libraries/TransientStateLibrary.sol";

import {IExecutionConfig} from "../oracle/interfaces/IExecutionConfig.sol";
import {OrderLib} from "../libraries/OrderLib.sol";
import {Constants} from "../libraries/Constants.sol";
import {ISwapPilotHook} from "./interfaces/ISwapPilotHook.sol";

// Uniswap v4 Hook: intercepts large swaps, queues via NoOp,
// executes at AI-predicted optimal timing via Reactive Network callbacks.
contract SwapPilotHook is BaseHook, ISwapPilotHook, IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using OrderLib for OrderLib.QueuedOrder;

    IExecutionConfig public immutable executionConfig;
    mapping(PoolId => OrderLib.QueuedOrder[]) internal _orderQueues;
    mapping(bytes32 => uint256) public orderIndex; // orderId => queue index
    uint256 public totalOrdersQueued;
    uint256 public totalOrdersExecuted;

    error QueueFull();
    error OrderNotQueued();
    error OrderNotExpired();
    error ExecutionConditionsNotMet();
    error InvalidOrderIndex();

    constructor(
        IPoolManager _poolManager,
        IExecutionConfig _executionConfig
    ) BaseHook(_poolManager) {
        executionConfig = _executionConfig;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true, // needed for NoOp
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // Register pool for SwapPilot on initialization
    function _beforeInitialize(address, PoolKey calldata key, uint160)
        internal
        override
        returns (bytes4)
    {
        PoolId poolId = key.toId();
        emit PoolRegistered(
            poolId,
            Currency.unwrap(key.currency0),
            Currency.unwrap(key.currency1),
            key.fee
        );
        return this.beforeInitialize.selector;
    }

    // Core hook: NoOp large swaps into the queue
    function _beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId poolId = key.toId();

        uint256 absAmount = params.amountSpecified < 0
            ? uint256(-params.amountSpecified)
            : uint256(params.amountSpecified);

        // Small swap — let it through
        if (!executionConfig.shouldQueue(poolId, absAmount)) {
            return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        // Large swap: NoOp + queue
        if (_orderQueues[poolId].length >= Constants.MAX_QUEUE_SIZE) {
            revert QueueFull();
        }

        Currency inputCurrency = params.zeroForOne ? key.currency0 : key.currency1;

        // Mint ERC-6909 claims — PoolManager debits the swapper
        poolManager.mint(address(this), inputCurrency.toId(), absAmount);

        OrderLib.QueuedOrder memory order = OrderLib.QueuedOrder({
            trader: sender,
            poolKey: key,
            params: params,
            queuedAt: block.timestamp,
            amountQueued: absAmount,
            zeroForOne: params.zeroForOne,
            status: OrderLib.OrderStatus.Queued
        });

        bytes32 orderId = order.encode();
        uint256 idx = _orderQueues[poolId].length;
        _orderQueues[poolId].push(order);
        orderIndex[orderId] = idx;
        totalOrdersQueued++;

        emit OrderQueued(orderId, sender, poolId, absAmount, block.timestamp);

        // Cancel AMM swap: hookDeltaSpecified = -amountSpecified => amountToSwap = 0
        int128 specifiedDelta = -int128(params.amountSpecified);
        return (this.beforeSwap.selector, toBeforeSwapDelta(specifiedDelta, 0), 0);
    }

    // Emit execution data for RSC cross-chain feedback
    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta delta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        emit SwapExecuted(poolId, sender, delta.amount0(), delta.amount1());
        return (this.afterSwap.selector, 0);
    }

    // Execute a queued swap at AI-predicted optimal moment (called via RSC callback)
    function executeQueuedSwap(PoolId poolId, uint256 _orderIndex) external {
        if (!executionConfig.shouldExecute(poolId)) {
            revert ExecutionConditionsNotMet();
        }

        OrderLib.QueuedOrder[] storage queue = _orderQueues[poolId];
        if (_orderIndex >= queue.length) revert InvalidOrderIndex();

        OrderLib.QueuedOrder storage order = queue[_orderIndex];
        if (order.status != OrderLib.OrderStatus.Queued) revert OrderNotQueued();
        if (order.isExpired()) revert OrderNotExpired();

        order.status = OrderLib.OrderStatus.Executed;
        totalOrdersExecuted++;

        bytes memory callbackData = abi.encode(poolId, _orderIndex, false);
        poolManager.unlock(callbackData);

        bytes32 orderId = order.encode();
        emit OrderExecuted(orderId, order.trader, poolId, 0);
    }

    // Expire an order past MAX_QUEUE_TIME — refunds tokens to trader
    function expireOrder(PoolId poolId, uint256 _orderIndex) external {
        OrderLib.QueuedOrder[] storage queue = _orderQueues[poolId];
        if (_orderIndex >= queue.length) revert InvalidOrderIndex();

        OrderLib.QueuedOrder storage order = queue[_orderIndex];
        if (order.status != OrderLib.OrderStatus.Queued) revert OrderNotQueued();
        if (!order.isExpired()) revert OrderNotExpired();

        order.status = OrderLib.OrderStatus.Expired;

        bytes memory callbackData = abi.encode(poolId, _orderIndex, true);
        poolManager.unlock(callbackData);

        bytes32 orderId = order.encode();
        emit OrderExpired(orderId, order.trader);
    }

    // Called by PoolManager during unlock — executes swap or refunds
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "SwapPilot: only pool manager");

        (PoolId poolId, uint256 _orderIndex, bool isExpire) = abi.decode(data, (PoolId, uint256, bool));
        OrderLib.QueuedOrder storage order = _orderQueues[poolId][_orderIndex];

        // Burn the ERC-6909 claims minted during queuing
        Currency inputCurrency = order.zeroForOne ? order.poolKey.currency0 : order.poolKey.currency1;
        poolManager.burn(address(this), inputCurrency.toId(), order.amountQueued);

        if (isExpire) {
            // Refund input tokens to trader
            poolManager.take(inputCurrency, order.trader, order.amountQueued);
        } else {
            // Execute the swap
            BalanceDelta delta = poolManager.swap(order.poolKey, order.params, "");

            Currency outputCurrency = order.zeroForOne ? order.poolKey.currency1 : order.poolKey.currency0;
            uint256 outputAmount;
            if (order.zeroForOne) {
                outputAmount = delta.amount1() > 0 ? uint256(int256(delta.amount1())) : 0;
            } else {
                outputAmount = delta.amount0() > 0 ? uint256(int256(delta.amount0())) : 0;
            }

            if (outputAmount > 0) {
                poolManager.take(outputCurrency, order.trader, outputAmount);
            }
        }

        return "";
    }

    function getQueueLength(PoolId poolId) external view returns (uint256) {
        return _orderQueues[poolId].length;
    }

    function getOrder(PoolId poolId, uint256 index) external view returns (OrderLib.QueuedOrder memory) {
        return _orderQueues[poolId][index];
    }

    function _currencyId(Currency currency) internal pure returns (uint256) {
        return uint256(uint160(Currency.unwrap(currency)));
    }
}
