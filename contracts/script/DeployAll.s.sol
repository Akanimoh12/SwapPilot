// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ExecutionConfig} from "../src/oracle/ExecutionConfig.sol";
import {IExecutionConfig} from "../src/oracle/interfaces/IExecutionConfig.sol";
import {Constants} from "../src/libraries/Constants.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @title DeployAll
/// @notice Full deployment: PoolManager, tokens, config, routers, pool init, liquidity.
/// Run this script to set up a complete SwapPilot testnet environment.
/// Hook must be deployed separately via DeployHook.s.sol after this script.
contract DeployAll is Script {
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console2.log("Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        // 1. Deploy PoolManager
        PoolManager poolManager = new PoolManager(deployer);
        console2.log("PoolManager:", address(poolManager));

        // 2. Deploy Mock Tokens
        MockERC20 usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        MockERC20 dai = new MockERC20("Mock DAI", "mDAI", 18);
        console2.log("Mock USDC:", address(usdc));
        console2.log("Mock DAI:", address(dai));

        // 3. Deploy ExecutionConfig
        ExecutionConfig executionConfig = new ExecutionConfig(
            Constants.CALLBACK_PROXY_ADDRESS,
            deployer
        );
        console2.log("ExecutionConfig:", address(executionConfig));

        // 4. Deploy PoolSwapTest (swap router)
        PoolSwapTest swapRouter = new PoolSwapTest(IPoolManager(address(poolManager)));
        console2.log("PoolSwapTest:", address(swapRouter));

        // 5. Deploy PoolModifyLiquidityTest (liquidity router)
        PoolModifyLiquidityTest liquidityRouter = new PoolModifyLiquidityTest(IPoolManager(address(poolManager)));
        console2.log("PoolModifyLiquidityTest:", address(liquidityRouter));

        // 6. Mint tokens
        usdc.mint(deployer, 10_000_000 * 10 ** 6);  // 10M USDC
        dai.mint(deployer, 10_000_000 ether);         // 10M DAI
        console2.log("Minted 10M USDC + 10M DAI");

        // 7. Approve tokens to routers
        IERC20(address(usdc)).approve(address(swapRouter), type(uint256).max);
        IERC20(address(dai)).approve(address(swapRouter), type(uint256).max);
        IERC20(address(usdc)).approve(address(liquidityRouter), type(uint256).max);
        IERC20(address(dai)).approve(address(liquidityRouter), type(uint256).max);
        console2.log("Tokens approved to routers");

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("Next steps:");
        console2.log("  1. Deploy hook:  POOL_MANAGER_ADDRESS=<above> EXECUTION_CONFIG_ADDRESS=<above> forge script script/DeployHook.s.sol ...");
        console2.log("  2. Init pool:    Run InitPool.s.sol with the hook address");
    }
}
