// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AbstractReactive} from "./AbstractReactive.sol";
import {IReactive} from "./interfaces/IReactive.sol";
import {IExecutionOracle} from "./interfaces/IExecutionOracle.sol";
import {IExecutionConfig} from "../oracle/interfaces/IExecutionConfig.sol";
import {Constants} from "../libraries/Constants.sol";

// RSC deployed on Reactive Network (Chain 1597).
// Subscribes to Swap/Mint events across Unichain, Ethereum, and Arbitrum.
// Computes cross-chain execution scores and sends callbacks to ExecutionConfig on Unichain.
contract ExecutionOracle is AbstractReactive, IExecutionOracle {

    // Reference Uniswap V3 pools for price/volume tracking
    address public constant ETH_UNISWAP_V3_POOL = 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640;
    address public constant ARB_UNISWAP_V3_POOL = 0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443;

    // Min score change to trigger a callback (prevents spam)
    uint256 public constant SCORE_DELTA_THRESHOLD = 5;

    address public immutable executionConfigAddress;
    address public immutable hookAddress;
    mapping(uint256 => ChainData) public chainData; // chainId => market data
    uint256 public lastScore;
    bytes32 public activePoolId;

    constructor(address _executionConfigAddress, address _hookAddress) {
        executionConfigAddress = _executionConfigAddress;
        hookAddress = _hookAddress;

        // Subscribe to SwapExecuted on Unichain from the hook
        subscribe(
            Constants.UNICHAIN_CHAIN_ID,
            _hookAddress,
            keccak256("SwapExecuted(bytes32,address,int256,int256)")
        );

        // Subscribe to Swap + Mint events on Ethereum and Arbitrum
        subscribe(Constants.ETHEREUM_CHAIN_ID, ETH_UNISWAP_V3_POOL, Constants.SWAP_EVENT_TOPIC);
        subscribe(Constants.ARBITRUM_CHAIN_ID, ARB_UNISWAP_V3_POOL, Constants.SWAP_EVENT_TOPIC);
        subscribe(Constants.ETHEREUM_CHAIN_ID, ETH_UNISWAP_V3_POOL, Constants.MINT_EVENT_TOPIC);
        subscribe(Constants.ARBITRUM_CHAIN_ID, ARB_UNISWAP_V3_POOL, Constants.MINT_EVENT_TOPIC);
    }

    // Called by Reactive Network when a subscribed event fires
    function react(LogRecord calldata log) external override {
        uint256 chainId = log.chainId;

        (uint256 price, uint256 volume) = _parseSwapEvent(log);

        ChainData storage cd = chainData[chainId];
        uint256 oldPrice = cd.lastPrice;

        cd.lastPrice = price;
        cd.lastVolume = volume;
        cd.lastBlock = log.blockNumber;

        if (oldPrice > 0) {
            cd.volatility = _computeVolatility(oldPrice, price);
        }

        // Compute cross-chain score from all 3 chains
        ChainData[3] memory chains;
        chains[0] = chainData[Constants.UNICHAIN_CHAIN_ID];
        chains[1] = chainData[Constants.ETHEREUM_CHAIN_ID];
        chains[2] = chainData[Constants.ARBITRUM_CHAIN_ID];

        uint256 newScore = _computeExecutionScore(chains);

        // Only callback if score changed enough
        uint256 scoreDelta = newScore > lastScore ? newScore - lastScore : lastScore - newScore;

        if (scoreDelta >= SCORE_DELTA_THRESHOLD) {
            lastScore = newScore;
            emit ScoreComputed(activePoolId, newScore, block.timestamp);

            // Update ExecutionConfig score on Unichain
            emit Callback(
                Constants.UNICHAIN_CHAIN_ID,
                executionConfigAddress,
                abi.encodeWithSelector(
                    IExecutionConfig.updateExecutionScore.selector,
                    activePoolId,
                    newScore
                )
            );
        }
    }

    // Volatility as absolute % change in basis points
    function _computeVolatility(uint256 oldPrice, uint256 newPrice) internal pure returns (uint256) {
        if (oldPrice == 0) return 0;
        uint256 diff = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
        return (diff * 10_000) / oldPrice;
    }

    // Cross-chain execution score: price convergence (0-40) + low vol (0-30) + volume (0-30)
    function _computeExecutionScore(ChainData[3] memory chains) internal pure returns (uint256) {
        // Factor 1: Cross-chain price convergence (0-40 points)
        uint256 priceScore = 40;

        if (chains[0].lastPrice > 0 && chains[1].lastPrice > 0) {
            uint256 divergence01 = _computeVolatility(chains[0].lastPrice, chains[1].lastPrice);
            if (divergence01 >= 200) {
                priceScore -= 20;
            } else {
                priceScore -= (divergence01 * 20) / 200;
            }
        }

        if (chains[0].lastPrice > 0 && chains[2].lastPrice > 0) {
            uint256 divergence02 = _computeVolatility(chains[0].lastPrice, chains[2].lastPrice);
            if (divergence02 >= 200) {
                priceScore -= 20;
            } else {
                priceScore -= (divergence02 * 20) / 200;
            }
        }

        // Factor 2: Low volatility (0-30 points)
        uint256 avgVolatility = (chains[0].volatility + chains[1].volatility + chains[2].volatility) / 3;
        uint256 volScore;
        if (avgVolatility == 0) {
            volScore = 30;
        } else if (avgVolatility >= 500) {
            volScore = 0;
        } else {
            volScore = 30 - (avgVolatility * 30) / 500;
        }

        // Factor 3: Volume activity (0-30 points)
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

    // Parse swap event log for price and volume data
    function _parseSwapEvent(LogRecord calldata log) internal pure returns (uint256 price, uint256 volume) {
        if (log.data.length >= 128) {
            // Extract sqrtPriceX96 from third slot, derive simplified price
            uint160 sqrtPriceX96 = uint160(uint256(bytes32(log.data[64:96])));
            price = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) / (1 << 96);

            // Volume: absolute value of amount0
            int256 amount0 = int256(uint256(bytes32(log.data[0:32])));
            volume = amount0 < 0 ? uint256(-amount0) : uint256(amount0);
        } else {
            price = uint256(log.topic1);
            volume = uint256(log.topic2);
        }
    }
}
