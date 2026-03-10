// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Constants} from "./Constants.sol";

// Library for managing queued swap orders
library OrderLib {
    using PoolIdLibrary for PoolKey;

    enum OrderStatus { Queued, Executed, Expired, Cancelled }

    // A large swap queued for deferred execution
    struct QueuedOrder {
        address trader;
        PoolKey poolKey;
        SwapParams params;
        uint256 queuedAt;
        uint256 amountQueued;
        bool zeroForOne;
        OrderStatus status;
    }

    // True if the order has passed MAX_QUEUE_TIME
    function isExpired(QueuedOrder storage order) internal view returns (bool) {
        return block.timestamp > order.queuedAt + Constants.MAX_QUEUE_TIME;
    }

    // Unique order ID = hash(trader, poolId, queuedAt)
    function encode(QueuedOrder memory order) internal pure returns (bytes32) {
        PoolId poolId = order.poolKey.toId();
        return keccak256(abi.encodePacked(order.trader, PoolId.unwrap(poolId), order.queuedAt));
    }
}
