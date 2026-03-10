// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {ExecutionConfig} from "../../src/oracle/ExecutionConfig.sol";
import {IExecutionConfig} from "../../src/oracle/interfaces/IExecutionConfig.sol";
import {MockCallbackProxy} from "../mocks/MockCallbackProxy.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

contract ExecutionConfigTest is Test {
    ExecutionConfig internal config;
    MockCallbackProxy internal proxy;

    address internal owner = address(this);
    address internal nonOwner = address(0xBEEF);

    PoolId internal poolId = PoolId.wrap(keccak256("test-pool"));

    function setUp() public {
        proxy = new MockCallbackProxy();
        config = new ExecutionConfig(address(proxy), owner);
    }

    // ─── setPoolConfig ──────────────────────────────────────────────────────

    function test_setPoolConfig_ownerCanSet() public {
        IExecutionConfig.PoolConfig memory pc = IExecutionConfig.PoolConfig({
            queueThreshold: 10 ether,
            maxQueueTime: 5 minutes,
            maxSlippage: 500,
            isActive: true
        });

        config.setPoolConfig(poolId, pc);

        (uint256 threshold, uint256 mqt, uint256 ms, bool active) = config.poolConfigs(poolId);
        assertEq(threshold, 10 ether);
        assertEq(mqt, 5 minutes);
        assertEq(ms, 500);
        assertTrue(active);
    }

    function test_setPoolConfig_nonOwnerReverts() public {
        IExecutionConfig.PoolConfig memory pc = IExecutionConfig.PoolConfig({
            queueThreshold: 10 ether,
            maxQueueTime: 5 minutes,
            maxSlippage: 500,
            isActive: true
        });

        vm.prank(nonOwner);
        vm.expectRevert();
        config.setPoolConfig(poolId, pc);
    }

    function test_setPoolConfig_emitsEvent() public {
        IExecutionConfig.PoolConfig memory pc = IExecutionConfig.PoolConfig({
            queueThreshold: 10 ether,
            maxQueueTime: 5 minutes,
            maxSlippage: 500,
            isActive: true
        });

        vm.expectEmit(true, false, false, true);
        emit IExecutionConfig.PoolConfigUpdated(poolId, 10 ether, 5 minutes);

        config.setPoolConfig(poolId, pc);
    }

    // ─── updateExecutionScore ───────────────────────────────────────────────

    function test_updateExecutionScore_callbackProxyCanUpdate() public {
        bytes memory payload = abi.encodeCall(config.updateExecutionScore, (poolId, 85));
        proxy.executeCallback(address(config), payload);

        (uint256 score, uint256 updatedAt) = config.getExecutionScore(poolId);
        assertEq(score, 85);
        assertEq(updatedAt, block.timestamp);
    }

    function test_updateExecutionScore_nonProxyReverts() public {
        vm.prank(nonOwner);
        vm.expectRevert("SwapPilot: unauthorized callback");
        config.updateExecutionScore(poolId, 85);
    }

    function test_updateExecutionScore_scoreAbove100Reverts() public {
        bytes memory payload = abi.encodeCall(config.updateExecutionScore, (poolId, 101));
        // The proxy.call will succeed at the proxy level, but the inner call reverts
        (bool success,) = proxy.executeCallback(address(config), payload);
        assertFalse(success, "Score > 100 should revert");
    }

    function test_updateExecutionScore_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IExecutionConfig.ExecutionScoreUpdated(poolId, 75, block.timestamp);

        // Call directly from proxy address
        vm.prank(address(proxy));
        config.updateExecutionScore(poolId, 75);
    }

    // ─── shouldQueue ────────────────────────────────────────────────────────

    function test_shouldQueue_trueWhenAboveThreshold() public {
        _setActivePool(10 ether);
        assertTrue(config.shouldQueue(poolId, 15 ether));
    }

    function test_shouldQueue_trueWhenEqualToThreshold() public {
        _setActivePool(10 ether);
        assertTrue(config.shouldQueue(poolId, 10 ether));
    }

    function test_shouldQueue_falseWhenBelowThreshold() public {
        _setActivePool(10 ether);
        assertFalse(config.shouldQueue(poolId, 5 ether));
    }

    function test_shouldQueue_falseWhenPoolInactive() public {
        IExecutionConfig.PoolConfig memory pc = IExecutionConfig.PoolConfig({
            queueThreshold: 10 ether,
            maxQueueTime: 5 minutes,
            maxSlippage: 500,
            isActive: false
        });
        config.setPoolConfig(poolId, pc);

        assertFalse(config.shouldQueue(poolId, 15 ether));
    }

    // ─── shouldExecute ──────────────────────────────────────────────────────

    function test_shouldExecute_trueWhenScoreHighAndFresh() public {
        _setScore(85);
        assertTrue(config.shouldExecute(poolId));
    }

    function test_shouldExecute_trueAtMinimumScore70() public {
        _setScore(70);
        assertTrue(config.shouldExecute(poolId));
    }

    function test_shouldExecute_falseWhenScoreBelow70() public {
        _setScore(69);
        assertFalse(config.shouldExecute(poolId));
    }

    function test_shouldExecute_falseWhenScoreIsStale() public {
        _setScore(85);
        // Warp past 2 minutes
        vm.warp(block.timestamp + 2 minutes + 1);
        assertFalse(config.shouldExecute(poolId));
    }

    function test_shouldExecute_trueJustBeforeStale() public {
        _setScore(85);
        // Warp to just before 2 minutes
        vm.warp(block.timestamp + 2 minutes - 1);
        assertTrue(config.shouldExecute(poolId));
    }

    function test_shouldExecute_falseWhenNoScoreSet() public view {
        // Score defaults to 0, lastUpdate defaults to 0
        assertFalse(config.shouldExecute(poolId));
    }

    // ─── isPoolActive ───────────────────────────────────────────────────────

    function test_isPoolActive_trueWhenActive() public {
        _setActivePool(10 ether);
        assertTrue(config.isPoolActive(poolId));
    }

    function test_isPoolActive_falseByDefault() public view {
        assertFalse(config.isPoolActive(poolId));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    function _setActivePool(uint256 threshold) internal {
        IExecutionConfig.PoolConfig memory pc = IExecutionConfig.PoolConfig({
            queueThreshold: threshold,
            maxQueueTime: 5 minutes,
            maxSlippage: 500,
            isActive: true
        });
        config.setPoolConfig(poolId, pc);
    }

    function _setScore(uint256 score) internal {
        vm.prank(address(proxy));
        config.updateExecutionScore(poolId, score);
    }
}
