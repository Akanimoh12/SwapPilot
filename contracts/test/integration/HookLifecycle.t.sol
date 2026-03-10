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
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {SwapPilotHook} from "../../src/hook/SwapPilotHook.sol";
import {ExecutionConfig} from "../../src/oracle/ExecutionConfig.sol";
import {IExecutionConfig} from "../../src/oracle/interfaces/IExecutionConfig.sol";
import {MockCallbackProxy} from "../mocks/MockCallbackProxy.sol";
import {OrderLib} from "../../src/libraries/OrderLib.sol";
import {Constants} from "../../src/libraries/Constants.sol";

/// @title HookLifecycle Integration Test
/// @notice Full end-to-end lifecycle tests: queue → execute and queue → expire flows
contract HookLifecycleTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    SwapPilotHook internal hook;
    ExecutionConfig internal executionConfig;
    MockCallbackProxy internal callbackProxy;

    PoolKey internal poolKey;
    PoolId internal poolId;

    uint256 constant QUEUE_THRESHOLD = 10 ether;

    function setUp() public {
        // 1. Deploy full v4 infrastructure
        deployFreshManagerAndRouters();

        // 2. Deploy mock callback proxy and execution config
        callbackProxy = new MockCallbackProxy();
        executionConfig = new ExecutionConfig(address(callbackProxy), address(this));

        // 3. Mine and deploy hook with correct address flags
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG |
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        (address hookAddr, bytes32 salt) = HookMiner.find(
            address(this),
            flags,
            type(SwapPilotHook).creationCode,
            abi.encode(manager, executionConfig)
        );

        hook = new SwapPilotHook{salt: salt}(
            IPoolManager(address(manager)),
            IExecutionConfig(address(executionConfig))
        );
        require(address(hook) == hookAddr, "Hook address mismatch");

        // 4. Deploy, mint, and approve test tokens
        deployMintAndApprove2Currencies();

        // 5. Initialize pool with hook
        (poolKey, poolId) = initPool(
            currency0, currency1,
            IHooks(address(hook)),
            3000, 60, SQRT_PRICE_1_1
        );

        // 6. Add substantial liquidity
        modifyLiquidityRouter.modifyLiquidity(poolKey, LIQUIDITY_PARAMS, ZERO_BYTES);
        seedMoreLiquidity(poolKey, 100 ether, 100 ether);

        // 7. Configure pool in ExecutionConfig
        IExecutionConfig.PoolConfig memory pc = IExecutionConfig.PoolConfig({
            queueThreshold: QUEUE_THRESHOLD,
            maxQueueTime: Constants.MAX_QUEUE_TIME,
            maxSlippage: 500,
            isActive: true
        });
        executionConfig.setPoolConfig(poolId, pc);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FULL FLOW: Queue → Update Score → Execute
    // ═══════════════════════════════════════════════════════════════════════════

    function test_fullFlow_queueAndExecute() public {
        // Step 1: Submit a large swap → gets NoOp'd → order queued
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        assertEq(hook.getQueueLength(poolId), 1, "Order should be queued");
        OrderLib.QueuedOrder memory order = hook.getOrder(poolId, 0);
        assertEq(uint8(order.status), uint8(OrderLib.OrderStatus.Queued));
        assertEq(order.amountQueued, QUEUE_THRESHOLD);

        // Step 2: Simulate RSC callback updating execution score to 85
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        (uint256 score,) = executionConfig.getExecutionScore(poolId);
        assertEq(score, 85, "Score should be updated");

        // Step 3: Execute the queued swap
        hook.executeQueuedSwap(poolId, 0);

        // Step 4: Verify order status is Executed
        order = hook.getOrder(poolId, 0);
        assertEq(uint8(order.status), uint8(OrderLib.OrderStatus.Executed));

        // Step 5: Verify counters
        assertEq(hook.totalOrdersExecuted(), 1);
        assertEq(hook.totalOrdersQueued(), 1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXPIRY FLOW: Queue → Wait → Expire → Refund
    // ═══════════════════════════════════════════════════════════════════════════

    function test_expiryFlow_queueAndExpire() public {
        // Step 1: Submit large swap → queued
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);
        assertEq(hook.getQueueLength(poolId), 1);

        // Step 2: Warp past maxQueueTime
        vm.warp(block.timestamp + Constants.MAX_QUEUE_TIME + 1);

        // Step 3: Expire the order
        hook.expireOrder(poolId, 0);

        // Step 4: Verify order status is Expired
        OrderLib.QueuedOrder memory order = hook.getOrder(poolId, 0);
        assertEq(uint8(order.status), uint8(OrderLib.OrderStatus.Expired));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MIXED FLOW: Small swap + Large swap + Execute
    // ═══════════════════════════════════════════════════════════════════════════

    function test_mixedFlow_smallAndLargeSwaps() public {
        // Step 1: Small swap passes through normally
        swap(poolKey, true, -1 ether, ZERO_BYTES);
        assertEq(hook.getQueueLength(poolId), 0, "Small swap should not be queued");

        // Step 2: Large swap gets queued
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);
        assertEq(hook.getQueueLength(poolId), 1, "Large swap should be queued");

        // Step 3: Another small swap passes through
        swap(poolKey, true, -1 ether, ZERO_BYTES);
        assertEq(hook.getQueueLength(poolId), 1, "Queue should still have 1 order");

        // Step 4: Execute the queued swap
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);
        hook.executeQueuedSwap(poolId, 0);

        // Step 5: Verify order executed
        OrderLib.QueuedOrder memory order = hook.getOrder(poolId, 0);
        assertEq(uint8(order.status), uint8(OrderLib.OrderStatus.Executed));
        assertEq(hook.totalOrdersExecuted(), 1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MULTIPLE ORDERS: Queue multiple → execute selectively
    // ═══════════════════════════════════════════════════════════════════════════

    function test_multipleOrders_queueAndManage() public {
        // Queue two orders
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);
        assertEq(hook.getQueueLength(poolId), 2);

        // Set high score
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        // Execute first order
        hook.executeQueuedSwap(poolId, 0);
        assertEq(uint8(hook.getOrder(poolId, 0).status), uint8(OrderLib.OrderStatus.Executed));
        assertEq(uint8(hook.getOrder(poolId, 1).status), uint8(OrderLib.OrderStatus.Queued));

        // Expire second order
        vm.warp(block.timestamp + Constants.MAX_QUEUE_TIME + 1);
        hook.expireOrder(poolId, 1);
        assertEq(uint8(hook.getOrder(poolId, 1).status), uint8(OrderLib.OrderStatus.Expired));

        assertEq(hook.totalOrdersQueued(), 2);
        assertEq(hook.totalOrdersExecuted(), 1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCORE STALENESS: Score becomes stale between queue and execute
    // ═══════════════════════════════════════════════════════════════════════════

    function test_staleness_cannotExecuteWithStaleScore() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Set score
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        // Warp past 2 minutes (score staleness)
        vm.warp(block.timestamp + 2 minutes + 1);

        // Should revert because score is stale
        vm.expectRevert(SwapPilotHook.ExecutionConditionsNotMet.selector);
        hook.executeQueuedSwap(poolId, 0);
    }

    function test_staleness_canExecuteAfterScoreRefresh() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Set initial score
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        // Warp past staleness
        vm.warp(block.timestamp + 2 minutes + 1);

        // Refresh the score
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 90);

        // Now execution should succeed
        hook.executeQueuedSwap(poolId, 0);

        OrderLib.QueuedOrder memory order = hook.getOrder(poolId, 0);
        assertEq(uint8(order.status), uint8(OrderLib.OrderStatus.Executed));
    }
}
