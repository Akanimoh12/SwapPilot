// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {ExecutionOracle} from "../src/rsc/ExecutionOracle.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/// @title DeployRSC
/// @notice Deploys the ExecutionOracle Reactive Smart Contract to Reactive Network.
///         The constructor auto-subscribes to events on Unichain, Ethereum, and Arbitrum.
contract DeployRSC is Script {
    function run() external {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.RSCConfig memory config = helperConfig.getRSCConfig();

        vm.startBroadcast(config.deployerKey);

        // Deploy ExecutionOracle RSC
        ExecutionOracle oracle = new ExecutionOracle(
            address(0x0000000000000000000000000000000000fffFfF),
            config.executionConfig,
            config.hookAddress
        );

        console2.log("--- RSC Deployment Complete ---");
        console2.log("ExecutionOracle deployed at:", address(oracle));
        console2.log("Watching ExecutionConfig at:", config.executionConfig);
        console2.log("Watching SwapPilotHook at:", config.hookAddress);

        vm.stopBroadcast();
    }
}
