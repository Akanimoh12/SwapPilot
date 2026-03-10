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

/// @title NoOpFlow Integration Test
/// @notice Verifies that NoOp'd swaps do not move pool state and that
///         ERC-6909 claim tokens are minted/burned correctly
contract NoOpFlowTest is Test, Deployers {
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
        deployFreshManagerAndRouters();

        callbackProxy = new MockCallbackProxy();
        executionConfig = new ExecutionConfig(address(callbackProxy), address(this));

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

        deployMintAndApprove2Currencies();

        (poolKey, poolId) = initPool(
            currency0, currency1,
            IHooks(address(hook)),
            3000, 60, SQRT_PRICE_1_1
        );

        modifyLiquidityRouter.modifyLiquidity(poolKey, LIQUIDITY_PARAMS, ZERO_BYTES);
        seedMoreLiquidity(poolKey, 100 ether, 100 ether);

        IExecutionConfig.PoolConfig memory pc = IExecutionConfig.PoolConfig({
            queueThreshold: QUEUE_THRESHOLD,
            maxQueueTime: Constants.MAX_QUEUE_TIME,
            maxSlippage: 500,
            isActive: true
        });
        executionConfig.setPoolConfig(poolId, pc);
    }

    // ─── Pool state unchanged after NoOp ────────────────────────────────────

    function test_noOp_poolPriceUnchanged() public {
        // Record pool state before the NoOp'd swap
        (uint160 sqrtPriceBefore, int24 tickBefore,,) = manager.getSlot0(poolId);

        // Submit a large swap (will be NoOp'd)
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Pool price and tick should NOT have moved
        (uint160 sqrtPriceAfter, int24 tickAfter,,) = manager.getSlot0(poolId);
        assertEq(sqrtPriceBefore, sqrtPriceAfter, "sqrtPrice should not change for NoOp swap");
        assertEq(tickBefore, tickAfter, "tick should not change for NoOp swap");
    }

    function test_noOp_poolLiquidityUnchanged() public {
        uint128 liquidityBefore = manager.getLiquidity(poolId);

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        uint128 liquidityAfter = manager.getLiquidity(poolId);
        assertEq(liquidityBefore, liquidityAfter, "Pool liquidity should not change for NoOp swap");
    }

    // ─── ERC-6909 claim tokens ──────────────────────────────────────────────

    function test_noOp_hookReceivesClaimTokens() public {
        Currency inputCurrency = poolKey.currency0; // zeroForOne = true
        uint256 claimId = inputCurrency.toId();

        uint256 claimsBefore = manager.balanceOf(address(hook), claimId);

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        uint256 claimsAfter = manager.balanceOf(address(hook), claimId);
        assertEq(
            claimsAfter - claimsBefore,
            QUEUE_THRESHOLD,
            "Hook should receive claim tokens equal to queued amount"
        );
    }

    function test_execution_claimTokensBurned() public {
        Currency inputCurrency = poolKey.currency0;
        uint256 claimId = inputCurrency.toId();

        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        uint256 claimsAfterQueue = manager.balanceOf(address(hook), claimId);
        assertGt(claimsAfterQueue, 0, "Hook should have claim tokens after queue");

        // Set high score and execute
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);
        hook.executeQueuedSwap(poolId, 0);

        uint256 claimsAfterExec = manager.balanceOf(address(hook), claimId);
        assertEq(claimsAfterExec, 0, "Claim tokens should be burned after execution");
    }

    // ─── Small swap DOES move pool state ────────────────────────────────────

    function test_smallSwap_poolPriceMoves() public {
        (uint160 sqrtPriceBefore,,,) = manager.getSlot0(poolId);

        // Small swap passes through normally
        swap(poolKey, true, -1 ether, ZERO_BYTES);

        (uint160 sqrtPriceAfter,,,) = manager.getSlot0(poolId);
        assertNotEq(sqrtPriceBefore, sqrtPriceAfter, "Small swap should move price");
    }

    // ─── Execution DOES move pool state ─────────────────────────────────────

    function test_execution_poolPriceMoves() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        (uint160 sqrtPriceBefore,,,) = manager.getSlot0(poolId);

        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);
        hook.executeQueuedSwap(poolId, 0);

        (uint160 sqrtPriceAfter,,,) = manager.getSlot0(poolId);
        assertNotEq(sqrtPriceBefore, sqrtPriceAfter, "Execution should move pool price");
    }
}
