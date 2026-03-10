// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {VolatilityLib} from "../../src/libraries/VolatilityLib.sol";

contract VolatilityLibTest is Test {
    // ─── computeSlippageEstimate ─────────────────────────────────────────────

    function test_computeSlippageEstimate_zeroAmount() public pure {
        uint256 slippage = VolatilityLib.computeSlippageEstimate(0, 1000 ether, 50);
        assertEq(slippage, 0, "Zero amount should produce zero slippage");
    }

    function test_computeSlippageEstimate_zeroLiquidity() public pure {
        uint256 slippage = VolatilityLib.computeSlippageEstimate(1 ether, 0, 50);
        assertEq(slippage, 10_000, "Zero liquidity should produce max slippage (100%)");
    }

    function test_computeSlippageEstimate_increasesWithAmount() public pure {
        uint256 slippageSmall = VolatilityLib.computeSlippageEstimate(1 ether, 1000 ether, 0);
        uint256 slippageLarge = VolatilityLib.computeSlippageEstimate(100 ether, 1000 ether, 0);
        assertGt(slippageLarge, slippageSmall, "Larger amount should produce more slippage");
    }

    function test_computeSlippageEstimate_increasesWithVolatility() public pure {
        uint256 slippageLow = VolatilityLib.computeSlippageEstimate(10 ether, 1000 ether, 0);
        uint256 slippageHigh = VolatilityLib.computeSlippageEstimate(10 ether, 1000 ether, 100);
        assertGt(slippageHigh, slippageLow, "Higher volatility should produce more slippage");
    }

    function test_computeSlippageEstimate_cappedAt10000() public pure {
        // A huge amount with tiny liquidity — should cap at 10000 bps
        uint256 slippage = VolatilityLib.computeSlippageEstimate(10000 ether, 1 ether, 100);
        assertEq(slippage, 10_000, "Slippage should be capped at 10000 bps");
    }

    // ─── normalizeScore ──────────────────────────────────────────────────────

    function test_normalizeScore_zero() public pure {
        assertEq(VolatilityLib.normalizeScore(0), 0);
    }

    function test_normalizeScore_midRange() public pure {
        assertEq(VolatilityLib.normalizeScore(5000), 50);
    }

    function test_normalizeScore_max() public pure {
        assertEq(VolatilityLib.normalizeScore(10_000), 100);
    }

    function test_normalizeScore_aboveMax() public pure {
        assertEq(VolatilityLib.normalizeScore(15_000), 100, "Above 10000 should clamp to 100");
    }

    function test_normalizeScore_maps0to10000() public pure {
        // Check a few boundary values
        assertEq(VolatilityLib.normalizeScore(100), 1);
        assertEq(VolatilityLib.normalizeScore(9999), 99);
        assertEq(VolatilityLib.normalizeScore(99), 0); // integer division truncates
    }

    // ─── isScoreAboveThreshold ───────────────────────────────────────────────

    function test_isScoreAboveThreshold_equal() public pure {
        assertTrue(VolatilityLib.isScoreAboveThreshold(70, 70), "Equal should return true");
    }

    function test_isScoreAboveThreshold_above() public pure {
        assertTrue(VolatilityLib.isScoreAboveThreshold(80, 70));
    }

    function test_isScoreAboveThreshold_below() public pure {
        assertFalse(VolatilityLib.isScoreAboveThreshold(69, 70));
    }

    function test_isScoreAboveThreshold_zeroThreshold() public pure {
        assertTrue(VolatilityLib.isScoreAboveThreshold(0, 0));
    }
}
