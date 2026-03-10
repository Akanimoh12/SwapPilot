// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IReactive} from "./IReactive.sol";

// Interface for the ExecutionOracle RSC on Reactive Network
interface IExecutionOracle is IReactive {
    // Cross-chain market data for a specific chain
    struct ChainData {
        uint256 lastPrice;
        uint256 lastVolume;
        uint256 lastBlock;
        uint256 volatility;
    }

    event ScoreComputed(bytes32 indexed poolId, uint256 score, uint256 timestamp);
}
