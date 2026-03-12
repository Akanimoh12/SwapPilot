// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MockERC20} from "../test/mocks/MockERC20.sol";
import {ExecutionConfig} from "../src/oracle/ExecutionConfig.sol";
import {IExecutionConfig} from "../src/oracle/interfaces/IExecutionConfig.sol";
import {Constants} from "../src/libraries/Constants.sol";

/// @title InitializePool
/// @notice Initializes pool with hook, adds liquidity, sets pool config.
/// Run after DeployAll + DeployHook.
contract InitializePool is Script {
    using PoolIdLibrary for PoolKey;

    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address poolManagerAddr = vm.envAddress("POOL_MANAGER_ADDRESS");
        address hookAddr = vm.envAddress("SWAPPILOT_HOOK_ADDRESS");
        address usdcAddr = vm.envAddress("MOCK_USDC_ADDRESS");
        address daiAddr = vm.envAddress("MOCK_DAI_ADDRESS");
        address liquidityRouterAddr = vm.envAddress("LIQUIDITY_ROUTER_ADDRESS");
        address executionConfigAddr = vm.envAddress("EXECUTION_CONFIG_ADDRESS");

        IPoolManager poolManager = IPoolManager(poolManagerAddr);

        // Sort tokens for PoolKey (currency0 < currency1)
        address token0;
        address token1;
        if (usdcAddr < daiAddr) {
            token0 = usdcAddr;
            token1 = daiAddr;
        } else {
            token0 = daiAddr;
            token1 = usdcAddr;
        }

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hookAddr)
        });

        PoolId poolId = poolKey.toId();

        console2.log("currency0:", token0);
        console2.log("currency1:", token1);
        console2.log("hook:", hookAddr);
        console2.log("poolId:");
        console2.logBytes32(PoolId.unwrap(poolId));

        vm.startBroadcast(deployerKey);

        // 1. Initialize the pool at 1:1 price
        poolManager.initialize(poolKey, SQRT_PRICE_1_1);
        console2.log("Pool initialized at SQRT_PRICE_1_1");

        // 2. Mint extra tokens for liquidity (need large amounts)
        MockERC20(usdcAddr).mint(deployer, 1_000_000_000 * 10 ** 6);  // 1B USDC
        MockERC20(daiAddr).mint(deployer, 1_000_000_000 ether);        // 1B DAI

        // 3. Approve tokens to liquidity router
        IERC20(usdcAddr).approve(liquidityRouterAddr, type(uint256).max);
        IERC20(daiAddr).approve(liquidityRouterAddr, type(uint256).max);

        // 4. Add liquidity — full range (moderate liquidity for testnet)
        PoolModifyLiquidityTest liquidityRouter = PoolModifyLiquidityTest(liquidityRouterAddr);
        ModifyLiquidityParams memory liqParams = ModifyLiquidityParams({
            tickLower: -887220,
            tickUpper: 887220,
            liquidityDelta: 1e14,
            salt: bytes32(0)
        });

        liquidityRouter.modifyLiquidity(poolKey, liqParams, "");
        console2.log("Added full-range liquidity");

        // 5. Set pool config on ExecutionConfig
        ExecutionConfig(executionConfigAddr).setPoolConfig(
            poolId,
            IExecutionConfig.PoolConfig({
                queueThreshold: Constants.DEFAULT_QUEUE_THRESHOLD,
                maxQueueTime: Constants.MAX_QUEUE_TIME,
                maxSlippage: 500,
                isActive: true
            })
        );
        console2.log("Pool config set on ExecutionConfig");

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== POOL INITIALIZATION COMPLETE ===");
    }
}
