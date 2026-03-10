// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

import {SwapPilotHook} from "../src/hook/SwapPilotHook.sol";
import {IExecutionConfig} from "../src/oracle/interfaces/IExecutionConfig.sol";

/// @title DeployHook
/// @notice Deploys SwapPilotHook via CREATE2 with address-mined salt.
///
/// Usage:
///   POOL_MANAGER_ADDRESS=0xC81462Fec8B23319F288047f8A03A57682a35C1A \
///   EXECUTION_CONFIG_ADDRESS=0xcCDB2468De9C89fA6e283B96A0A6714201610F8E \
///   forge script script/DeployHook.s.sol \
///     --rpc-url https://sepolia.unichain.org \
///     --private-key $PRIVATE_KEY \
///     --broadcast -vvv
contract DeployHook is Script {
    // Forge's deterministic CREATE2 deployer proxy
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address executionConfig = vm.envAddress("EXECUTION_CONFIG_ADDRESS");

        // Flag bits the hook address must have set (bottom 14 bits)
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG |
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        console2.log("Mining hook address with CREATE2 deployer:", CREATE2_DEPLOYER);
        console2.log("Required flags:", uint256(flags));

        // Mine a salt — deployer is the CREATE2 proxy for forge scripts
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(SwapPilotHook).creationCode,
            abi.encode(IPoolManager(poolManager), IExecutionConfig(executionConfig))
        );

        console2.log("Found hook address:", hookAddress);
        console2.log("Salt:", uint256(salt));

        vm.startBroadcast(deployerKey);

        // Deploy with the mined salt — Forge routes this through the CREATE2 proxy
        SwapPilotHook hook = new SwapPilotHook{salt: salt}(
            IPoolManager(poolManager),
            IExecutionConfig(executionConfig)
        );

        console2.log("");
        console2.log("=== HOOK DEPLOYED ===");
        console2.log("SwapPilotHook:", address(hook));

        require(
            address(hook) == hookAddress,
            "DeployHook: deployed address mismatch"
        );

        vm.stopBroadcast();
    }
}
