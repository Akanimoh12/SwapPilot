// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Re-export the official Reactive Network AbstractReactive
// This file exists for backward compatibility with our import paths.
import {AbstractReactive as ReactiveBase} from "reactive-lib/abstract-base/AbstractReactive.sol";

abstract contract AbstractReactive is ReactiveBase {
    uint256 internal constant _REACTIVE_IGNORE = REACTIVE_IGNORE;

    // Helper to subscribe with just topic_0, ignoring other topics
    function subscribe(uint256 chainId, address contractAddress, uint256 topic0) internal {
        service.subscribe(chainId, contractAddress, topic0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
    }
}
