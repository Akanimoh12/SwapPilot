// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {OrderLib} from "../../src/libraries/OrderLib.sol";
import {Constants} from "../../src/libraries/Constants.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

contract OrderLibTest is Test {
    using PoolIdLibrary for PoolKey;
    using OrderLib for OrderLib.QueuedOrder;

    // Storage array to test isExpired with storage references
    OrderLib.QueuedOrder[] internal orders;

    function _makePoolKey() internal pure returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0x1111)),
            currency1: Currency.wrap(address(0x2222)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });
    }

    function _makeSwapParams() internal pure returns (SwapParams memory) {
        return SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: 0
        });
    }

    function _makeOrder(address trader, uint256 queuedAt) internal pure returns (OrderLib.QueuedOrder memory) {
        return OrderLib.QueuedOrder({
            trader: trader,
            poolKey: _makePoolKey(),
            params: _makeSwapParams(),
            queuedAt: queuedAt,
            amountQueued: 10 ether,
            zeroForOne: true,
            status: OrderLib.OrderStatus.Queued
        });
    }

    // ─── isExpired ───────────────────────────────────────────────────────────

    function test_isExpired_returnsFalseBeforeMaxQueueTime() public {
        OrderLib.QueuedOrder memory order = _makeOrder(address(this), block.timestamp);
        orders.push(order);

        // Warp to just before expiry
        vm.warp(block.timestamp + Constants.MAX_QUEUE_TIME - 1);
        assertFalse(orders[0].isExpired(), "Should not be expired before MAX_QUEUE_TIME");
    }

    function test_isExpired_returnsTrueAfterMaxQueueTime() public {
        OrderLib.QueuedOrder memory order = _makeOrder(address(this), block.timestamp);
        orders.push(order);

        // Warp past expiry
        vm.warp(block.timestamp + Constants.MAX_QUEUE_TIME + 1);
        assertTrue(orders[0].isExpired(), "Should be expired after MAX_QUEUE_TIME");
    }

    function test_isExpired_exactBoundary() public {
        uint256 ts = block.timestamp;
        OrderLib.QueuedOrder memory order = _makeOrder(address(this), ts);
        orders.push(order);

        // Warp to exactly MAX_QUEUE_TIME — block.timestamp == queuedAt + MAX_QUEUE_TIME
        // isExpired checks block.timestamp > queuedAt + MAX_QUEUE_TIME, so should be false
        vm.warp(ts + Constants.MAX_QUEUE_TIME);
        assertFalse(orders[0].isExpired(), "Exact boundary should not be expired (uses >)");
    }

    // ─── encode ──────────────────────────────────────────────────────────────

    function test_encode_deterministicHash() public pure {
        OrderLib.QueuedOrder memory order = _makeOrder(address(0xBEEF), 1000);
        bytes32 hash1 = order.encode();
        bytes32 hash2 = order.encode();
        assertEq(hash1, hash2, "Same order should produce same hash");
    }

    function test_encode_differentTrader_differentHash() public pure {
        OrderLib.QueuedOrder memory order1 = _makeOrder(address(0xBEEF), 1000);
        OrderLib.QueuedOrder memory order2 = _makeOrder(address(0xCAFE), 1000);
        assertNotEq(order1.encode(), order2.encode(), "Different traders should produce different hashes");
    }

    function test_encode_differentTimestamp_differentHash() public pure {
        OrderLib.QueuedOrder memory order1 = _makeOrder(address(0xBEEF), 1000);
        OrderLib.QueuedOrder memory order2 = _makeOrder(address(0xBEEF), 2000);
        assertNotEq(order1.encode(), order2.encode(), "Different timestamps should produce different hashes");
    }

    function test_encode_nonZeroHash() public pure {
        OrderLib.QueuedOrder memory order = _makeOrder(address(0xBEEF), 1000);
        assertNotEq(order.encode(), bytes32(0), "Hash should not be zero");
    }
}
