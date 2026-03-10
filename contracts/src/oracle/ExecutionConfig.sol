// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IExecutionConfig} from "./interfaces/IExecutionConfig.sol";

// Stores per-pool config and AI execution scores for SwapPilot.
// Callback proxy (Reactive Network) updates scores; owner manages pool configs.
contract ExecutionConfig is IExecutionConfig, Ownable {

    address public immutable callbackProxy;
    mapping(PoolId => PoolConfig) public poolConfigs;
    mapping(PoolId => uint256) public executionScores;   // 0-100
    mapping(PoolId => uint256) public lastScoreUpdate;

    error UnauthorizedCallback();
    error InvalidScore();

    constructor(address _callbackProxy, address _owner) Ownable(_owner) {
        callbackProxy = _callbackProxy;
    }

    // Owner sets pool config
    function setPoolConfig(PoolId poolId, PoolConfig calldata config) external onlyOwner {
        poolConfigs[poolId] = config;
        emit PoolConfigUpdated(poolId, config.queueThreshold, config.maxQueueTime);
    }

    // Callback proxy updates AI score
    function updateExecutionScore(PoolId poolId, uint256 score) external {
        require(msg.sender == callbackProxy, "SwapPilot: unauthorized callback");
        require(score <= 100, "SwapPilot: score out of range");

        executionScores[poolId] = score;
        lastScoreUpdate[poolId] = block.timestamp;

        emit ExecutionScoreUpdated(poolId, score, block.timestamp);
    }

    function getExecutionScore(PoolId poolId) external view returns (uint256 score, uint256 updatedAt) {
        score = executionScores[poolId];
        updatedAt = lastScoreUpdate[poolId];
    }

    function isPoolActive(PoolId poolId) external view returns (bool) {
        return poolConfigs[poolId].isActive;
    }

    // True if pool is active and swap amount meets threshold
    function shouldQueue(PoolId poolId, uint256 swapAmount) external view returns (bool) {
        PoolConfig storage config = poolConfigs[poolId];
        return config.isActive && swapAmount >= config.queueThreshold;
    }

    // True if score >= 70 and updated within 2 minutes
    function shouldExecute(PoolId poolId) external view returns (bool) {
        uint256 score = executionScores[poolId];
        uint256 lastUpdate = lastScoreUpdate[poolId];
        return score >= 70 && block.timestamp - lastUpdate < 2 minutes;
    }
}
