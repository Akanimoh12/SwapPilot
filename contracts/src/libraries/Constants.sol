// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Shared constants used across SwapPilot
library Constants {
    // Chain IDs
    uint256 internal constant UNICHAIN_CHAIN_ID = 130;
    uint256 internal constant ETHEREUM_CHAIN_ID = 1;
    uint256 internal constant ARBITRUM_CHAIN_ID = 42161;
    uint256 internal constant REACTIVE_CHAIN_ID = 1597;

    // Reactive Network callback proxy on Unichain
    address internal constant CALLBACK_PROXY_ADDRESS = 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4;

    // Event topic hashes for Swap and Mint
    bytes32 internal constant SWAP_EVENT_TOPIC =
        keccak256("Swap(address,address,int256,int256,uint160,uint128,int24)");
    bytes32 internal constant MINT_EVENT_TOPIC =
        keccak256("Mint(address,address,int24,int24,uint128,uint256,uint256)");

    // Queue defaults
    uint256 internal constant DEFAULT_QUEUE_THRESHOLD = 10 ether; // min swap size to queue
    uint256 internal constant MAX_QUEUE_TIME = 5 minutes;         // expiry window
    uint256 internal constant MAX_QUEUE_SIZE = 50;                // max orders per pool
}
