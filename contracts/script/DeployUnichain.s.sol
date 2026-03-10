// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

import {ExecutionConfig} from "../src/oracle/ExecutionConfig.sol";
import {IExecutionConfig} from "../src/oracle/interfaces/IExecutionConfig.sol";
import {Constants} from "../src/libraries/Constants.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @title DeployUnichain
/// @notice Deploys all SwapPilot contracts on Unichain Sepolia (except hook, which needs separate CREATE2 script).
contract DeployUnichain is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");

        vm.startBroadcast(deployerKey);

        // 1. Mock Tokens
        MockERC20 tokenA = new MockERC20("Mock USDC", "mUSDC", 6);
        MockERC20 tokenB = new MockERC20("Mock DAI", "mDAI", 18);
        tokenA.mint(deployer, 1_000_000 * 10 ** 6);
        tokenB.mint(deployer, 1_000_000 ether);

        console2.log("Mock USDC:", address(tokenA));
        console2.log("Mock DAI:", address(tokenB));

        // 2. ExecutionConfig — with REAL callback proxy for Unichain Sepolia
        ExecutionConfig executionConfig = new ExecutionConfig(
            Constants.CALLBACK_PROXY_ADDRESS,  // 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4
            deployer
        );
        console2.log("ExecutionConfig:", address(executionConfig));
        console2.log("  callbackProxy:", Constants.CALLBACK_PROXY_ADDRESS);

        // 3. PoolSwapTest (swap router)
        PoolSwapTest swapRouter = new PoolSwapTest(IPoolManager(poolManager));
        console2.log("PoolSwapTest:", address(swapRouter));

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== UNICHAIN SEPOLIA DEPLOYMENT COMPLETE ===");
        console2.log("Next: deploy hook with DeployHook.s.sol using the new ExecutionConfig address");
    }
}
