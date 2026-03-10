// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {OrderLib} from "../../libraries/OrderLib.sol";

// Interface for the SwapPilot Hook
interface ISwapPilotHook {
    event OrderQueued(
        bytes32 indexed orderId,
        address indexed trader,
        PoolId indexed poolId,
        uint256 amount,
        uint256 timestamp
    );

    event OrderExecuted(
        bytes32 indexed orderId,
        address indexed trader,
        PoolId indexed poolId,
        uint256 slippageSaved
    );

    event OrderExpired(bytes32 indexed orderId, address indexed trader);
    event PoolRegistered(PoolId indexed poolId, address token0, address token1, uint24 fee);
    event SwapExecuted(PoolId indexed poolId, address indexed sender, int256 amount0, int256 amount1);

    function executeQueuedSwap(PoolId poolId, uint256 orderIndex) external;
    function expireOrder(PoolId poolId, uint256 orderIndex) external;
    function getQueueLength(PoolId poolId) external view returns (uint256);
    function getOrder(PoolId poolId, uint256 index) external view returns (OrderLib.QueuedOrder memory);
}
