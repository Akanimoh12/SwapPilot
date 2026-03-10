// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {Deployers} from "lib/v4-core/test/utils/Deployers.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {SwapPilotHook} from "../../src/hook/SwapPilotHook.sol";
import {ExecutionConfig} from "../../src/oracle/ExecutionConfig.sol";
import {IExecutionConfig} from "../../src/oracle/interfaces/IExecutionConfig.sol";
import {MockCallbackProxy} from "../mocks/MockCallbackProxy.sol";
import {OrderLib} from "../../src/libraries/OrderLib.sol";
import {Constants} from "../../src/libraries/Constants.sol";

contract SwapPilotHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    SwapPilotHook internal hook;
    ExecutionConfig internal executionConfig;
    MockCallbackProxy internal callbackProxy;

    PoolKey internal poolKey;
    PoolId internal poolId;

    uint256 constant QUEUE_THRESHOLD = 10 ether;

    function setUp() public {
        // Deploy PoolManager and all routers
        deployFreshManagerAndRouters();

        // Deploy mock callback proxy and ExecutionConfig
        callbackProxy = new MockCallbackProxy();
        executionConfig = new ExecutionConfig(address(callbackProxy), address(this));

        // Mine a hook address with the correct flags
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG |
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        bytes memory constructorArgs = abi.encode(manager, executionConfig);
        (address hookAddr, bytes32 salt) = HookMiner.find(
            address(this),
            flags,
            type(SwapPilotHook).creationCode,
            constructorArgs
        );

        // Deploy the hook with CREATE2
        hook = new SwapPilotHook{salt: salt}(
            IPoolManager(address(manager)),
            IExecutionConfig(address(executionConfig))
        );
        require(address(hook) == hookAddr, "Hook address mismatch");

        // Deploy and mint test tokens, approve all routers
        deployMintAndApprove2Currencies();

        // Initialize pool with the hook
        (poolKey, poolId) = initPool(
            currency0,
            currency1,
            IHooks(address(hook)),
            3000,
            60,
            SQRT_PRICE_1_1
        );

        // Add liquidity to the pool
        modifyLiquidityRouter.modifyLiquidity(poolKey, LIQUIDITY_PARAMS, ZERO_BYTES);

        // Set pool config on ExecutionConfig so the hook knows about the threshold
        IExecutionConfig.PoolConfig memory pc = IExecutionConfig.PoolConfig({
            queueThreshold: QUEUE_THRESHOLD,
            maxQueueTime: Constants.MAX_QUEUE_TIME,
            maxSlippage: 500,
            isActive: true
        });
        executionConfig.setPoolConfig(poolId, pc);
    }

    // ─── Small swap passes through ──────────────────────────────────────────

    function test_smallSwap_passesThrough() public {
        uint256 queueLengthBefore = hook.getQueueLength(poolId);

        // Swap a small amount (below threshold)
        swap(poolKey, true, -1 ether, ZERO_BYTES);

        // Queue should not grow
        assertEq(hook.getQueueLength(poolId), queueLengthBefore, "Small swap should not be queued");
    }

    // ─── Large swap gets NoOp'd and queued ──────────────────────────────────

    function test_largeSwap_queuesOrder() public {
        uint256 queueLengthBefore = hook.getQueueLength(poolId);

        // Swap a large amount (above threshold)
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Queue should grow by 1
        assertEq(hook.getQueueLength(poolId), queueLengthBefore + 1, "Large swap should be queued");
    }

    function test_largeSwap_storesCorrectOrderData() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        OrderLib.QueuedOrder memory order = hook.getOrder(poolId, 0);
        // The sender in the hook callback is the swapRouter, not address(this)
        assertEq(order.trader, address(swapRouter), "Trader should be the swap router");
        assertEq(order.amountQueued, QUEUE_THRESHOLD, "Amount should match");
        assertTrue(order.zeroForOne, "Should be zeroForOne");
        assertEq(uint8(order.status), uint8(OrderLib.OrderStatus.Queued), "Status should be Queued");
        assertEq(order.queuedAt, block.timestamp, "Timestamp should match");
    }

    function test_largeSwap_incrementsTotalQueued() public {
        uint256 totalBefore = hook.totalOrdersQueued();

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        assertEq(hook.totalOrdersQueued(), totalBefore + 1, "Total queued should increment");
    }

    // ─── getQueueLength ─────────────────────────────────────────────────────

    function test_getQueueLength_correctCount() public {
        assertEq(hook.getQueueLength(poolId), 0, "Initial queue should be empty");

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);
        assertEq(hook.getQueueLength(poolId), 1, "Queue should have 1 order");

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);
        assertEq(hook.getQueueLength(poolId), 2, "Queue should have 2 orders");
    }

    // ─── executeQueuedSwap ──────────────────────────────────────────────────

    function test_executeQueuedSwap_revertsWhenScoreTooLow() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Set score below 70
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 50);

        vm.expectRevert(SwapPilotHook.ExecutionConditionsNotMet.selector);
        hook.executeQueuedSwap(poolId, 0);
    }

    function test_executeQueuedSwap_revertsWhenNoScore() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // No score set (defaults to 0)
        vm.expectRevert(SwapPilotHook.ExecutionConditionsNotMet.selector);
        hook.executeQueuedSwap(poolId, 0);
    }

    function test_executeQueuedSwap_succeeds() public {
        // Add more liquidity so the swap can actually execute
        _seedLiquidity();

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Set high score via callback proxy
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        // Execute should succeed
        hook.executeQueuedSwap(poolId, 0);

        // Order should be marked as Executed
        OrderLib.QueuedOrder memory order = hook.getOrder(poolId, 0);
        assertEq(uint8(order.status), uint8(OrderLib.OrderStatus.Executed));
    }

    function test_executeQueuedSwap_incrementsTotalExecuted() public {
        _seedLiquidity();

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        uint256 totalBefore = hook.totalOrdersExecuted();
        hook.executeQueuedSwap(poolId, 0);

        assertEq(hook.totalOrdersExecuted(), totalBefore + 1);
    }

    function test_executeQueuedSwap_cannotExecuteTwice() public {
        _seedLiquidity();

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        hook.executeQueuedSwap(poolId, 0);

        // Second execution should revert
        vm.expectRevert(SwapPilotHook.OrderNotQueued.selector);
        hook.executeQueuedSwap(poolId, 0);
    }

    function test_executeQueuedSwap_revertsInvalidIndex() public {
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        vm.expectRevert(SwapPilotHook.InvalidOrderIndex.selector);
        hook.executeQueuedSwap(poolId, 99);
    }

    // ─── expireOrder ────────────────────────────────────────────────────────

    function test_expireOrder_worksAfterMaxQueueTime() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Warp past MAX_QUEUE_TIME
        vm.warp(block.timestamp + Constants.MAX_QUEUE_TIME + 1);

        hook.expireOrder(poolId, 0);

        OrderLib.QueuedOrder memory order = hook.getOrder(poolId, 0);
        assertEq(uint8(order.status), uint8(OrderLib.OrderStatus.Expired));
    }

    function test_expireOrder_cannotExpireBeforeMaxQueueTime() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Don't warp — order is fresh
        vm.expectRevert(SwapPilotHook.OrderNotExpired.selector);
        hook.expireOrder(poolId, 0);
    }

    function test_expireOrder_cannotExpireAlreadyExpired() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        vm.warp(block.timestamp + Constants.MAX_QUEUE_TIME + 1);
        hook.expireOrder(poolId, 0);

        // Second expire should revert
        vm.expectRevert(SwapPilotHook.OrderNotQueued.selector);
        hook.expireOrder(poolId, 0);
    }

    function test_expireOrder_revertsInvalidIndex() public {
        vm.expectRevert(SwapPilotHook.InvalidOrderIndex.selector);
        hook.expireOrder(poolId, 99);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    /// @dev Add more liquidity so the pool can handle large swaps
    function _seedLiquidity() internal {
        seedMoreLiquidity(poolKey, 100 ether, 100 ether);
    }
}
