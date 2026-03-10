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
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {SwapPilotHook} from "../../src/hook/SwapPilotHook.sol";
import {ExecutionConfig} from "../../src/oracle/ExecutionConfig.sol";
import {IExecutionConfig} from "../../src/oracle/interfaces/IExecutionConfig.sol";
import {MockCallbackProxy} from "../mocks/MockCallbackProxy.sol";
import {OrderLib} from "../../src/libraries/OrderLib.sol";
import {Constants} from "../../src/libraries/Constants.sol";

/// @title CallbackAuth Integration Test
/// @notice Tests authorization boundaries on ExecutionConfig.updateExecutionScore
///         and that executeQueuedSwap is permissionless (relies on score, not caller)
contract CallbackAuthTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    SwapPilotHook internal hook;
    ExecutionConfig internal executionConfig;
    MockCallbackProxy internal callbackProxy;

    PoolKey internal poolKey;
    PoolId internal poolId;

    uint256 constant QUEUE_THRESHOLD = 10 ether;

    address internal randomUser = address(0xCAFE);

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

    // ─── updateExecutionScore auth ──────────────────────────────────────────

    function test_updateScore_onlyCallbackProxy() public {
        // Callback proxy can update
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        (uint256 score,) = executionConfig.getExecutionScore(poolId);
        assertEq(score, 85);
    }

    function test_updateScore_randomUserReverts() public {
        vm.prank(randomUser);
        vm.expectRevert("SwapPilot: unauthorized callback");
        executionConfig.updateExecutionScore(poolId, 85);
    }

    function test_updateScore_ownerCannotUpdate() public {
        // Even the owner cannot call updateExecutionScore directly
        vm.expectRevert("SwapPilot: unauthorized callback");
        executionConfig.updateExecutionScore(poolId, 85);
    }

    function test_updateScore_hookCannotUpdate() public {
        vm.prank(address(hook));
        vm.expectRevert("SwapPilot: unauthorized callback");
        executionConfig.updateExecutionScore(poolId, 85);
    }

    function test_updateScore_viaProxyCallback() public {
        // Use the proxy's executeCallback to simulate a real RSC callback
        bytes memory payload = abi.encodeCall(
            executionConfig.updateExecutionScore,
            (poolId, 90)
        );
        (bool success,) = callbackProxy.executeCallback(address(executionConfig), payload);
        assertTrue(success, "Callback via proxy should succeed");

        (uint256 score,) = executionConfig.getExecutionScore(poolId);
        assertEq(score, 90);
    }

    // ─── executeQueuedSwap is permissionless ────────────────────────────────

    function test_executeQueuedSwap_anyoneCanCall() public {
        // Queue an order
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        // Set high score via callback proxy
        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        // Random user can execute
        vm.prank(randomUser);
        hook.executeQueuedSwap(poolId, 0);

        // Verify order is executed
        assertEq(
            uint8(hook.getOrder(poolId, 0).status),
            uint8(OrderLib.OrderStatus.Executed)
        );
    }

    function test_executeQueuedSwap_hookCanCall() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        vm.prank(address(callbackProxy));
        executionConfig.updateExecutionScore(poolId, 85);

        vm.prank(address(hook));
        hook.executeQueuedSwap(poolId, 0);

        assertEq(
            uint8(hook.getOrder(poolId, 0).status),
            uint8(OrderLib.OrderStatus.Executed)
        );
    }

    // ─── expireOrder is also permissionless ─────────────────────────────────

    function test_expireOrder_anyoneCanCall() public {
        swap(poolKey, true, -int256(QUEUE_THRESHOLD), ZERO_BYTES);

        vm.warp(block.timestamp + Constants.MAX_QUEUE_TIME + 1);

        vm.prank(randomUser);
        hook.expireOrder(poolId, 0);

        assertEq(
            uint8(hook.getOrder(poolId, 0).status),
            uint8(OrderLib.OrderStatus.Expired)
        );
    }
}
