// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Slippage estimation and AI score helpers
library VolatilityLib {
    // Estimate slippage in basis points (1 bp = 0.01%)
    function computeSlippageEstimate(
        uint256 amountIn,
        uint256 poolLiquidity,
        uint256 volatilityScore
    ) internal pure returns (uint256 slippageBps) {
        if (poolLiquidity == 0) return 10_000; // 100% if no liquidity

        uint256 baseSlippage = (amountIn * 10_000) / poolLiquidity;

        // Volatility multiplier: 1.0x (score=0) to 2.0x (score=100)
        uint256 multiplier = 100 + volatilityScore;
        slippageBps = (baseSlippage * multiplier) / 100;

        if (slippageBps > 10_000) {
            slippageBps = 10_000;
        }
    }

    // Check if score meets minimum threshold
    function isScoreAboveThreshold(uint256 score, uint256 threshold) internal pure returns (bool) {
        return score >= threshold;
    }

    // Normalize raw score (0-10000) to 0-100
    function normalizeScore(uint256 rawScore) internal pure returns (uint256) {
        if (rawScore > 10_000) {
            return 100;
        }
        return rawScore / 100;
    }
}
