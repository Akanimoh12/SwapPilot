# SwapPilot — Reactive Network Integration

## Overview

SwapPilot uses a Reactive Smart Contract (RSC) deployed on the Reactive Network (Chain ID 1597) to autonomously monitor cross-chain market conditions and trigger optimal swap execution on Unichain.

## How the RSC Works

The `ExecutionOracle` RSC is an `AbstractReactive` contract deployed to the Reactive Network. When the Reactive Network detects an event matching a subscription, it automatically calls the RSC's `react(LogRecord calldata log)` function.

```
┌───────────────────────────────┐
│     Reactive Network          │
│                               │
│  ┌─────────────────────────┐  │
│  │  ExecutionOracle RSC    │  │
│  │                         │  │
│  │  react(log) {           │  │
│  │    updateMarketState()  │  │
│  │    computeScore()       │  │
│  │    if score > 75:       │  │
│  │      emit Callback()   │  │
│  │  }                      │  │
│  └─────────────────────────┘  │
│           │                   │
│    Callback Event             │
│           │                   │
└───────────┼───────────────────┘
            │
            ▼
┌───────────────────────────────┐
│  Callback Proxy on Unichain  │
│  0x9299...7FC4                │
│  → calls target contract     │
└───────────────────────────────┘
```

## Event Subscriptions

The RSC constructor calls `subscribe(chainId, contractAddress, eventTopic)` for each event type:

| Chain | Chain ID | Contract | Event | Topic |
|---|---|---|---|---|
| Unichain | 130 | SwapPilotHook | `OrderQueued` | `keccak256("OrderQueued(uint256,address,bytes32,int256,bool,uint256)")` |
| Unichain | 130 | Any (address(0)) | `Swap` | `0xc42079f9...` |
| Ethereum | 1 | Any (address(0)) | `Swap` | `0xc42079f9...` |
| Arbitrum | 42161 | Any (address(0)) | `Swap` | `0xc42079f9...` |
| Unichain | 130 | Any (address(0)) | `Mint` | `0x7a53080b...` |

Using `address(0)` as the contract address subscribes to events from **all** contracts on that chain with the matching topic.

## Callback Proxy Flow

1. The RSC emits a `Callback` event:
   ```solidity
   emit Callback(
       130,                        // destination chain (Unichain)
       swapPilotHookAddress,       // target contract
       abi.encodeWithSignature(
           "executeQueuedSwap(uint256,uint256)",
           orderId,
           aiScore
       )
   );
   ```

2. The Reactive Network relayer picks up the `Callback` event.

3. The relayer sends a transaction to the **Callback Proxy** on Unichain (`0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4`).

4. The Callback Proxy calls the target contract with the encoded payload.

5. SwapPilotHook verifies `msg.sender == CALLBACK_PROXY` before executing the swap.

## Score Computation

The RSC maintains `MarketState` per chain:

```solidity
struct MarketState {
    int256 lastPrice;
    uint256 swapVolume;
    uint256 liquidityDepth;
    uint256 lastUpdateBlock;
}
```

The execution score is computed from 4 factors:

| Factor | Points | Condition |
|---|---|---|
| Liquidity depth | +15 | Pool liquidity > 10× order amount |
| Price alignment | +15 | Cross-chain price divergence < threshold |
| Low volatility | +10 | Recent swap volume below threshold |
| Activity gap | +10 | No swaps in last 5 blocks (MEV safety) |
| Base score | 50 | Always applied |

Total maximum: 100. Execution threshold: 75.

## Debugging RSC Issues

### RSC Not Reacting

1. **Check subscription**: Verify the RSC subscribed to the correct chain IDs and event topics in its constructor.
2. **Check event emission**: Verify the origin contract emits the expected event with the correct topic.
3. **Check Reactive Network status**: Use `https://mainnet-rpc.rnk.dev/` to query the RSC state.

### Callback Not Arriving

1. **Check callback format**: The `Callback` event must include the correct destination chain ID and target address.
2. **Check Callback Proxy**: Verify `0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4` is operational on Unichain.
3. **Check gas**: The relayer needs sufficient gas on the destination chain to deliver the callback.
4. **Check authentication**: Ensure the target function checks `msg.sender == CALLBACK_PROXY`.

### Score Not Updating

1. **Check staleness**: `shouldExecute` returns false if the score is older than 2 minutes.
2. **Check threshold**: The score must be ≥ 70 for `shouldExecute` to return true.
3. **Check RSC logs**: Look for `MarketStateUpdated` and `ExecutionTriggered` events on the Reactive Network.

### Testing Locally

Use the `MockCallbackProxy` contract to simulate RSC callbacks in Foundry tests:

```solidity
MockCallbackProxy proxy = new MockCallbackProxy();
ExecutionConfig config = new ExecutionConfig(address(proxy));

// Simulate RSC updating the score
proxy.executeCallback(
    address(config),
    abi.encodeWithSelector(
        IExecutionConfig.updateExecutionScore.selector,
        poolId,
        85  // AI score
    )
);
```
