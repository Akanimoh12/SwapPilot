// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

interface IERC20 {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TestSwap is Script {
    // Deployed addresses
    address constant MUSDC = 0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C;
    address constant MDAI = 0x7d1dea64e891dccb20f85bC379227238c8C1308b;
    address constant SWAP_ROUTER = 0xd48ee69b1206c3fdD17E5668A2725E10c2B0f11D;
    address constant HOOK = 0xCB611482dC1112f768B965d655d83b1DbcF420c8;

    uint160 constant MIN_SQRT_PRICE = 4295128739 + 1;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("mUSDC balance before:", IERC20(MUSDC).balanceOf(deployer));
        console.log("mDAI balance before:", IERC20(MDAI).balanceOf(deployer));

        vm.startBroadcast(deployerKey);

        // 1. Mint 1000 mUSDC (6 decimals)
        IERC20(MUSDC).mint(deployer, 1000e6);
        console.log("mUSDC after mint:", IERC20(MUSDC).balanceOf(deployer));

        // 2. Approve PoolSwapTest
        IERC20(MUSDC).approve(SWAP_ROUTER, type(uint256).max);

        // 3. Construct PoolKey (currency0 < currency1)
        // MUSDC (0x20E8...) < MDAI (0x7d1d...) => currency0=MUSDC, currency1=MDAI
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(MUSDC),
            currency1: Currency.wrap(MDAI),
            fee: 3000,
            tickSpacing: int24(60),
            hooks: IHooks(HOOK)
        });

        // 4. Swap 10 mUSDC for mDAI (exact input, zeroForOne)
        PoolSwapTest(SWAP_ROUTER).swap(
            key,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(10e6),  // negative = exact input
                sqrtPriceLimitX96: MIN_SQRT_PRICE
            }),
            PoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ""  // empty hookData
        );

        vm.stopBroadcast();

        console.log("mUSDC after swap:", IERC20(MUSDC).balanceOf(deployer));
        console.log("mDAI after swap:", IERC20(MDAI).balanceOf(deployer));
        console.log("SWAP SUCCEEDED!");
    }
}
