// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

import {ExecutionConfig} from "../src/oracle/ExecutionConfig.sol";
import {SwapPilotHook} from "../src/hook/SwapPilotHook.sol";
import {IExecutionConfig} from "../src/oracle/interfaces/IExecutionConfig.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @title DeployTestnet
/// @notice Full testnet deployment: mock tokens + ExecutionConfig + PoolSwapTest + SwapPilotHook.
///
/// Usage:
///   forge script script/DeployTestnet.s.sol \
///     --rpc-url $UNICHAIN_TESTNET_RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast -vvv
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address poolManagerAddr = vm.envOr("POOL_MANAGER_ADDRESS", address(0));
        address callbackProxy = vm.envOr("CALLBACK_PROXY_ADDRESS", address(0));

        vm.startBroadcast(deployerKey);

        // ─── 1. Deploy Mock Tokens ───────────────────────────────────────
        MockERC20 tokenA = new MockERC20("Mock USDC", "mUSDC", 6);
        MockERC20 tokenB = new MockERC20("Mock DAI", "mDAI", 18);

        // Mint 1M of each to deployer for liquidity + testing
        tokenA.mint(deployer, 1_000_000 * 10 ** 6);
        tokenB.mint(deployer, 1_000_000 ether);

        console2.log("Mock USDC deployed at:", address(tokenA));
        console2.log("Mock DAI  deployed at:", address(tokenB));

        // ─── 2. Deploy ExecutionConfig ───────────────────────────────────
        ExecutionConfig executionConfig = new ExecutionConfig(
            callbackProxy,
            deployer
        );
        console2.log("ExecutionConfig deployed at:", address(executionConfig));

        // ─── 3. Deploy PoolSwapTest (swap router) ───────────────────────
        PoolSwapTest swapRouter;
        if (poolManagerAddr != address(0)) {
            swapRouter = new PoolSwapTest(IPoolManager(poolManagerAddr));
            console2.log("PoolSwapTest deployed at:", address(swapRouter));
        }

        // ─── 4. Deploy SwapPilotHook via CREATE2 ────────────────────────
        // NOTE: Hook deployment via CREATE2 requires computing the address
        // with the correct CREATE2 factory. Deploy separately if needed.
        // The frontend works without the hook for testnet demos.

        // ─── 5. Summary ─────────────────────────────────────────────────
        console2.log("");
        console2.log("=== TESTNET DEPLOYMENT COMPLETE ===");
        console2.log("Add these to your frontend .env.local:");
        console2.log("NEXT_PUBLIC_TOKEN_USDC=", address(tokenA));
        console2.log("NEXT_PUBLIC_TOKEN_DAI=", address(tokenB));
        console2.log("NEXT_PUBLIC_EXECUTION_CONFIG_ADDRESS=", address(executionConfig));
        if (poolManagerAddr != address(0)) {
            console2.log("NEXT_PUBLIC_SWAP_ROUTER_ADDRESS=", address(swapRouter));
        }

        vm.stopBroadcast();
    }
}
