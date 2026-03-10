// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ExecutionOracle} from "../src/rsc/ExecutionOracle.sol";

/// @title DeployReactive
/// @notice Deploys ExecutionOracle RSC on Reactive Lasna testnet (chain 5318007).
///         Uses forge create with --value to fund the contract for subscription fees.
contract DeployReactive is Script {
    address constant SYSTEM_CONTRACT = 0x0000000000000000000000000000000000fffFfF;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address executionConfig = vm.envAddress("EXECUTION_CONFIG_ADDRESS");
        address hookAddress = vm.envAddress("HOOK_ADDRESS");

        vm.startBroadcast(deployerKey);

        // NOTE: Use forge create directly instead of this script.
        // forge create --value 1ether --constructor-args <system> <config> <hook>
        ExecutionOracle oracle = new ExecutionOracle{value: 1 ether}(
            SYSTEM_CONTRACT,
            executionConfig,
            hookAddress
        );

        console2.log("=== REACTIVE LASNA DEPLOYMENT COMPLETE ===");
        console2.log("ExecutionOracle:", address(oracle));
        console2.log("  executionConfigAddress:", executionConfig);
        console2.log("  hookAddress:", hookAddress);

        vm.stopBroadcast();
    }
}
