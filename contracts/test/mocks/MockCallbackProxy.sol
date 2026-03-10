// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Simulates Reactive Network callback proxy for testing
contract MockCallbackProxy {
    event CallbackExecuted(address indexed target, bool success, bytes returnData);

    // Execute a callback to a target, simulating a Reactive Network callback
    function executeCallback(address target, bytes calldata payload) external returns (bool success, bytes memory returnData) {
        (success, returnData) = target.call(payload);
        emit CallbackExecuted(target, success, returnData);
    }
}
