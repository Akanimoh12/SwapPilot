// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

import {Constants} from "../src/libraries/Constants.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/// @title QueueSwap
/// @notice Demo script that submits a large swap to trigger SwapPilot's queue mechanism.
///         Requires a pool to have been created first (via CreatePool.s.sol).
contract QueueSwap is Script {
    using PoolIdLibrary for PoolKey;

    function run() external {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        address hookAddress = vm.envAddress("HOOK_ADDRESS");
        address swapRouterAddress = vm.envAddress("SWAP_ROUTER_ADDRESS");
        uint256 swapAmount = vm.envOr("SWAP_AMOUNT", Constants.DEFAULT_QUEUE_THRESHOLD + 1 ether);

        vm.startBroadcast(config.deployerKey);

        // Reconstruct the PoolKey
        Currency currency0;
        Currency currency1;
        if (uint160(config.token0) < uint160(config.token1)) {
            currency0 = Currency.wrap(config.token0);
            currency1 = Currency.wrap(config.token1);
        } else {
            currency0 = Currency.wrap(config.token1);
            currency1 = Currency.wrap(config.token0);
        }

        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        PoolId poolId = poolKey.toId();

        // Approve tokens for the swap router
        IERC20(Currency.unwrap(currency0)).approve(swapRouterAddress, type(uint256).max);

        console2.log("--- Submitting Large Swap ---");
        console2.log("Swap amount:", swapAmount);
        console2.log("Direction: zeroForOne (token0 -> token1)");
        console2.log("Pool ID:", uint256(PoolId.unwrap(poolId)));

        // Submit a large swap (above queue threshold) via PoolSwapTest router
        PoolSwapTest router = PoolSwapTest(swapRouterAddress);
        router.swap(
            poolKey,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(swapAmount),
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ""
        );

        console2.log("Swap submitted! Order should be queued by SwapPilotHook.");
        console2.log("Check hook.getQueueLength() and hook.getOrder() for status.");

        vm.stopBroadcast();
    }
}
