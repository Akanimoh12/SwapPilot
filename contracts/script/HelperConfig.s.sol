// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";

/// @title HelperConfig
/// @notice Network-specific configuration for SwapPilot deployments.
///         Returns addresses and settings based on the target chain.
contract HelperConfig is Script {
    // ─── Structs ─────────────────────────────────────────────────────────────

    struct NetworkConfig {
        address poolManager;
        address callbackProxy;
        address token0;
        address token1;
        uint256 deployerKey;
    }

    struct RSCConfig {
        address executionConfig; // ExecutionConfig address on Unichain
        address hookAddress; // SwapPilotHook address on Unichain
        uint256 deployerKey;
    }

    // ─── Chain IDs ───────────────────────────────────────────────────────────

    uint256 constant UNICHAIN_MAINNET = 130;
    uint256 constant UNICHAIN_TESTNET = 1301;
    uint256 constant REACTIVE_NETWORK = 1597;

    // ─── Getters ─────────────────────────────────────────────────────────────

    function getUnichainConfig() public view returns (NetworkConfig memory) {
        return NetworkConfig({
            poolManager: vm.envAddress("POOL_MANAGER_ADDRESS"),
            callbackProxy: vm.envAddress("CALLBACK_PROXY_ADDRESS"),
            token0: vm.envAddress("TOKEN0_ADDRESS"),
            token1: vm.envAddress("TOKEN1_ADDRESS"),
            deployerKey: vm.envUint("PRIVATE_KEY")
        });
    }

    function getUnichainTestnetConfig() public view returns (NetworkConfig memory) {
        return NetworkConfig({
            poolManager: vm.envOr("TESTNET_POOL_MANAGER", address(0)),
            callbackProxy: vm.envOr("TESTNET_CALLBACK_PROXY", address(0)),
            token0: vm.envOr("TESTNET_TOKEN0", address(0)),
            token1: vm.envOr("TESTNET_TOKEN1", address(0)),
            deployerKey: vm.envUint("PRIVATE_KEY")
        });
    }

    function getRSCConfig() public view returns (RSCConfig memory) {
        return RSCConfig({
            executionConfig: vm.envAddress("EXECUTION_CONFIG_ADDRESS"),
            hookAddress: vm.envAddress("HOOK_ADDRESS"),
            deployerKey: vm.envUint("PRIVATE_KEY")
        });
    }

    function getActiveNetworkConfig() public view returns (NetworkConfig memory) {
        if (block.chainid == UNICHAIN_MAINNET) {
            return getUnichainConfig();
        } else if (block.chainid == UNICHAIN_TESTNET) {
            return getUnichainTestnetConfig();
        } else {
            // Default / local anvil
            return NetworkConfig({
                poolManager: address(0),
                callbackProxy: address(0),
                token0: address(0),
                token1: address(0),
                deployerKey: vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80))
            });
        }
    }
}
