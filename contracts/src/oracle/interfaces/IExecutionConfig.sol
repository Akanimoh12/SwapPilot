// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

// Interface for SwapPilot execution config and AI score oracle
interface IExecutionConfig {
    struct PoolConfig {
        uint256 queueThreshold;
        uint256 maxQueueTime;
        uint256 maxSlippage;
        bool isActive;
    }

    event PoolConfigUpdated(PoolId indexed poolId, uint256 threshold, uint256 maxQueueTime);
    event ExecutionScoreUpdated(PoolId indexed poolId, uint256 score, uint256 timestamp);

    function setPoolConfig(PoolId poolId, PoolConfig calldata config) external;
    function updateExecutionScore(PoolId poolId, uint256 score) external;
    function getExecutionScore(PoolId poolId) external view returns (uint256 score, uint256 updatedAt);
    function isPoolActive(PoolId poolId) external view returns (bool);
    function shouldQueue(PoolId poolId, uint256 swapAmount) external view returns (bool);
    function shouldExecute(PoolId poolId) external view returns (bool);
}
