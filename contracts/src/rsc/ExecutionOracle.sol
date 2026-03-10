// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AbstractReactive} from "./AbstractReactive.sol";
import {IReactive} from "reactive-lib/interfaces/IReactive.sol";
import {ISystemContract} from "reactive-lib/interfaces/ISystemContract.sol";
import {IExecutionOracle} from "./interfaces/IExecutionOracle.sol";
import {IExecutionConfig} from "../oracle/interfaces/IExecutionConfig.sol";
import {Constants} from "../libraries/Constants.sol";

// RSC deployed on Reactive Lasna (Chain 5318007).
// Subscribes to Swap/Mint events across Unichain Sepolia, Ethereum Sepolia, and Arbitrum Sepolia.
// Computes cross-chain execution scores and sends callbacks to ExecutionConfig on Unichain Sepolia.
contract ExecutionOracle is IReactive, AbstractReactive, IExecutionOracle {

    // Reference Uniswap V3 pools for price/volume tracking (Sepolia testnet)
    address public constant ETH_UNISWAP_V3_POOL = 0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1;
    address public constant ARB_UNISWAP_V3_POOL = 0xb60AfC010E72556F34c0624C52DBFD91F234D1F0;

    uint256 public constant SCORE_DELTA_THRESHOLD = 5;
    uint64 public constant CALLBACK_GAS_LIMIT = 1_000_000;

    address public immutable executionConfigAddress;
    address public immutable hookAddress;
    mapping(uint256 => ChainData) public chainData;
    uint256 public lastScore;
    bytes32 public activePoolId;

    constructor(
        address _service,
        address _executionConfigAddress,
        address _hookAddress
    ) payable {
        service = ISystemContract(payable(_service));
        executionConfigAddress = _executionConfigAddress;
        hookAddress = _hookAddress;

        if (!vm) {
            // Subscribe to SwapExecuted on Unichain Sepolia from the hook
            subscribe(
                Constants.UNICHAIN_CHAIN_ID,
                _hookAddress,
                uint256(keccak256("SwapExecuted(bytes32,address,int256,int256)"))
            );

            // Subscribe to Swap + Mint events on Ethereum Sepolia and Arbitrum Sepolia
            subscribe(Constants.ETHEREUM_CHAIN_ID, ETH_UNISWAP_V3_POOL, uint256(Constants.SWAP_EVENT_TOPIC));
            subscribe(Constants.ARBITRUM_CHAIN_ID, ARB_UNISWAP_V3_POOL, uint256(Constants.SWAP_EVENT_TOPIC));
            subscribe(Constants.ETHEREUM_CHAIN_ID, ETH_UNISWAP_V3_POOL, uint256(Constants.MINT_EVENT_TOPIC));
            subscribe(Constants.ARBITRUM_CHAIN_ID, ARB_UNISWAP_V3_POOL, uint256(Constants.MINT_EVENT_TOPIC));
        }
    }

    // Called by Reactive Network when a subscribed event fires
    function react(LogRecord calldata log) external vmOnly {
        uint256 chainId = log.chain_id;

        (uint256 price, uint256 volume) = _parseSwapEvent(log);

        ChainData storage cd = chainData[chainId];
        uint256 oldPrice = cd.lastPrice;

        cd.lastPrice = price;
        cd.lastVolume = volume;
        cd.lastBlock = log.block_number;

        if (oldPrice > 0) {
            cd.volatility = _computeVolatility(oldPrice, price);
        }

        // Compute cross-chain score from all 3 chains
        ChainData[3] memory chains;
        chains[0] = chainData[Constants.UNICHAIN_CHAIN_ID];
        chains[1] = chainData[Constants.ETHEREUM_CHAIN_ID];
        chains[2] = chainData[Constants.ARBITRUM_CHAIN_ID];

        uint256 newScore = _computeExecutionScore(chains);

        uint256 scoreDelta = newScore > lastScore ? newScore - lastScore : lastScore - newScore;

        if (scoreDelta >= SCORE_DELTA_THRESHOLD) {
            lastScore = newScore;
            emit ScoreComputed(activePoolId, newScore, block.timestamp);

            // Callback to ExecutionConfig on Unichain Sepolia
            emit Callback(
                Constants.UNICHAIN_CHAIN_ID,
                executionConfigAddress,
                CALLBACK_GAS_LIMIT,
                abi.encodeWithSelector(
                    IExecutionConfig.updateExecutionScore.selector,
                    activePoolId,
                    newScore
                )
            );
        }
    }

    function _computeVolatility(uint256 oldPrice, uint256 newPrice) internal pure returns (uint256) {
        if (oldPrice == 0) return 0;
        uint256 diff = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
        return (diff * 10_000) / oldPrice;
    }

    function _computeExecutionScore(ChainData[3] memory chains) internal pure returns (uint256) {
        uint256 priceScore = 40;

        if (chains[0].lastPrice > 0 && chains[1].lastPrice > 0) {
            uint256 divergence01 = _computeVolatility(chains[0].lastPrice, chains[1].lastPrice);
            priceScore -= divergence01 >= 200 ? 20 : (divergence01 * 20) / 200;
        }

        if (chains[0].lastPrice > 0 && chains[2].lastPrice > 0) {
            uint256 divergence02 = _computeVolatility(chains[0].lastPrice, chains[2].lastPrice);
            priceScore -= divergence02 >= 200 ? 20 : (divergence02 * 20) / 200;
        }

        uint256 avgVolatility = (chains[0].volatility + chains[1].volatility + chains[2].volatility) / 3;
        uint256 volScore;
        if (avgVolatility == 0) {
            volScore = 30;
        } else if (avgVolatility >= 500) {
            volScore = 0;
        } else {
            volScore = 30 - (avgVolatility * 30) / 500;
        }

        uint256 totalVolume = chains[0].lastVolume + chains[1].lastVolume + chains[2].lastVolume;
        uint256 volumeScore;
        if (totalVolume == 0) {
            volumeScore = 10;
        } else if (totalVolume >= 1000 ether) {
            volumeScore = 30;
        } else {
            volumeScore = 10 + (totalVolume * 20) / (1000 ether);
        }

        return priceScore + volScore + volumeScore;
    }

    function _parseSwapEvent(LogRecord calldata log) internal pure returns (uint256 price, uint256 volume) {
        if (log.data.length >= 128) {
            uint160 sqrtPriceX96 = uint160(uint256(bytes32(log.data[64:96])));
            price = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) / (1 << 96);

            int256 amount0 = int256(uint256(bytes32(log.data[0:32])));
            volume = amount0 < 0 ? uint256(-amount0) : uint256(amount0);
        } else {
            price = log.topic_1;
            volume = log.topic_2;
        }
    }
}
