// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IReactive} from "./interfaces/IReactive.sol";

// Base contract for Reactive Smart Contracts (RSCs) on Reactive Network
abstract contract AbstractReactive is IReactive {
    // Emitted to subscribe to an event on a source chain
    event Subscribe(uint256 indexed chainId, address indexed contractAddress, bytes32 indexed eventTopic);

    // Emitted to send a callback to a destination chain
    event Callback(uint256 indexed chainId, address indexed target, bytes payload);

    // Subscribe to an event on a source chain
    function subscribe(uint256 chainId, address contractAddress, bytes32 eventTopic) internal {
        emit Subscribe(chainId, contractAddress, eventTopic);
    }
}
