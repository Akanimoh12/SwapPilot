// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

import {ExecutionConfig} from "../src/oracle/ExecutionConfig.sol";
import {IExecutionConfig} from "../src/oracle/interfaces/IExecutionConfig.sol";
import {Constants} from "../src/libraries/Constants.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/// @title CreatePool
/// @notice Creates a Uniswap v4 pool with SwapPilotHook attached and configures it.
///         Requires DeploySwapPilot to have been run first.
contract CreatePool is Script {
    using PoolIdLibrary for PoolKey;

    function run() external {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        address hookAddress = vm.envAddress("HOOK_ADDRESS");
        address executionConfigAddress = vm.envAddress("EXECUTION_CONFIG_ADDRESS");

        vm.startBroadcast(config.deployerKey);

        IPoolManager poolManager = IPoolManager(config.poolManager);

        // Sort tokens (currency0 < currency1)
        Currency currency0;
        Currency currency1;
        if (uint160(config.token0) < uint160(config.token1)) {
            currency0 = Currency.wrap(config.token0);
            currency1 = Currency.wrap(config.token1);
        } else {
            currency0 = Currency.wrap(config.token1);
            currency1 = Currency.wrap(config.token0);
        }

        // Create PoolKey with the hook
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000, // 0.30% fee
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        PoolId poolId = poolKey.toId();

        // Initialize the pool at 1:1 price
        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(0); // 1:1
        poolManager.initialize(poolKey, sqrtPriceX96);

        console2.log("--- Pool Created ---");
        console2.log("Pool ID:", uint256(PoolId.unwrap(poolId)));
        console2.log("Token0:", config.token0);
        console2.log("Token1:", config.token1);
        console2.log("Hook:", hookAddress);
        console2.log("Fee: 3000 (0.30%)");

        // Configure pool in ExecutionConfig
        ExecutionConfig execConfig = ExecutionConfig(executionConfigAddress);
        IExecutionConfig.PoolConfig memory poolConfig = IExecutionConfig.PoolConfig({
            queueThreshold: Constants.DEFAULT_QUEUE_THRESHOLD,
            maxQueueTime: Constants.MAX_QUEUE_TIME,
            maxSlippage: 500, // 5%
            isActive: true
        });
        execConfig.setPoolConfig(poolId, poolConfig);

        console2.log("Pool config set:");
        console2.log("  Queue threshold:", Constants.DEFAULT_QUEUE_THRESHOLD);
        console2.log("  Max queue time:", Constants.MAX_QUEUE_TIME);
        console2.log("  Active: true");

        vm.stopBroadcast();
    }
}
