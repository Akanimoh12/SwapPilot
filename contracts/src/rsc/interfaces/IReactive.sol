// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Minimal interface for Reactive Network reactive smart contracts
interface IReactive {
    // Log record from a subscribed event
    struct LogRecord {
        uint256 chainId;
        address emitter;
        bytes32 topic0;
        bytes32 topic1;
        bytes32 topic2;
        bytes32 topic3;
        bytes data;
        uint256 blockNumber;
        uint256 opCode;
        uint256 txHash;
    }

    // Called by Reactive Network when a subscribed event fires
    function react(LogRecord calldata log) external;
}
