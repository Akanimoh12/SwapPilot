// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {ExecutionConfig} from "../src/oracle/ExecutionConfig.sol";
import {SwapPilotHook} from "../src/hook/SwapPilotHook.sol";
import {IExecutionConfig} from "../src/oracle/interfaces/IExecutionConfig.sol";
import {Constants} from "../src/libraries/Constants.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/// @title DeploySwapPilot
/// @notice Deploys ExecutionConfig and SwapPilotHook to Unichain.
///         Uses CREATE2 + HookMiner to mine a hook address with correct permission flags.
contract DeploySwapPilot is Script {
    function run() external {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getActiveNetworkConfig();

        vm.startBroadcast(config.deployerKey);
        address deployer = vm.addr(config.deployerKey);

        // 1. Deploy ExecutionConfig
        ExecutionConfig executionConfig = new ExecutionConfig(
            config.callbackProxy,
            deployer
        );
        console2.log("ExecutionConfig deployed at:", address(executionConfig));

        // 2. Mine hook address with correct flags
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG |
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        bytes memory constructorArgs = abi.encode(
            config.poolManager,
            address(executionConfig)
        );

        (address hookAddress, bytes32 salt) = HookMiner.find(
            deployer,
            flags,
            type(SwapPilotHook).creationCode,
            constructorArgs
        );
        console2.log("Mined hook address:", hookAddress);

        // 3. Deploy SwapPilotHook with CREATE2
        SwapPilotHook hook = new SwapPilotHook{salt: salt}(
            IPoolManager(config.poolManager),
            IExecutionConfig(address(executionConfig))
        );
        require(address(hook) == hookAddress, "Hook address mismatch");
        console2.log("SwapPilotHook deployed at:", address(hook));

        // 4. Set default pool config (can be updated later via owner)
        // This is a placeholder — real pools will be configured after CreatePool
        console2.log("--- Deployment Complete ---");
        console2.log("ExecutionConfig:", address(executionConfig));
        console2.log("SwapPilotHook:", address(hook));
        console2.log("Callback Proxy:", config.callbackProxy);

        vm.stopBroadcast();
    }
}
