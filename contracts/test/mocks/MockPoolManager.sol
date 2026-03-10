// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// MockPoolManager is NOT needed for SwapPilot tests.
//
// Uniswap v4-core provides a full PoolManager that can be deployed directly
// in Foundry tests, along with test helpers:
//   - Deployers.sol (test/utils/Deployers.sol)
//   - PoolSwapTest.sol (src/test/PoolSwapTest.sol)
//   - PoolModifyLiquidityTest.sol (src/test/PoolModifyLiquidityTest.sol)
//
// All SwapPilot tests use the real PoolManager via the Deployers contract.
