# SwapPilot

[![Contracts CI](https://github.com/your-username/swappilot/actions/workflows/contracts.yml/badge.svg)](https://github.com/your-username/swappilot/actions/workflows/contracts.yml)
[![AI Engine CI](https://github.com/your-username/swappilot/actions/workflows/ai-engine.yml/badge.svg)](https://github.com/your-username/swappilot/actions/workflows/ai-engine.yml)
[![Frontend CI](https://github.com/your-username/swappilot/actions/workflows/frontend.yml/badge.svg)](https://github.com/your-username/swappilot/actions/workflows/frontend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Unichain](https://img.shields.io/badge/Chain-Unichain-7B3FE4)](https://unichain.org)
[![Reactive Network](https://img.shields.io/badge/Automation-Reactive%20Network-00C2FF)](https://reactive.network)

An AI-powered Asynchronous Swap Execution Hook with cross-chain timing intelligence via Reactive Network.

> **Submission for:** Atrium Academy UHI8 Hookathon — Individual Track
> **Theme:** Specialized Markets — Large-Cap Execution
> **Sponsor Integration:** Reactive Network

---

## Overview

SwapPilot is a **Uniswap v4 Hook** that intercepts large swaps, queues them via a NoOp, and uses AI to predict the optimal block and moment to execute — minimizing price impact, slippage, and MEV exposure.

Instead of executing large trades instantly (suffering massive slippage), SwapPilot holds the swap and waits for the AI model to identify the best execution window based on cross-chain liquidity depth, trading patterns, and volatility. **Reactive Network** RSCs monitor swap activity across Unichain, Ethereum, and Arbitrum in real-time. When the AI determines optimal conditions, the RSC triggers a callback to execute the queued swap — fully autonomous.

## Key Results

| Metric | Instant Execution | SwapPilot | Improvement |
|---|---|---|---|
| Avg Slippage | 182 bps | 54 bps | **-70%** |
| MEV Extracted | $12.4K/month | $0.8K/month | **-94%** |
| Fill Rate | 100% | 100% | Same |

---

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) (stable)
- [Node.js](https://nodejs.org/) 20+
- [Python](https://www.python.org/) 3.11+

### Installation

```bash
git clone https://github.com/your-username/swappilot.git
cd swappilot
make install
```

### Running Locally

```bash
# Terminal 1: Start AI engine
make ai-serve

# Terminal 2: Start frontend
make frontend-dev

# Open http://localhost:3000
```

### Testing

```bash
# Run all tests
make test-all

# Individual workspaces
make test            # Solidity (forge test)
make ai-test         # Python (pytest)
make frontend-test   # Frontend (jest)
```

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│  UNICHAIN (Chain ID: 130)                              │
│                                                        │
│  Trader → PoolManager → SwapPilotHook                  │
│           │              ├─ beforeSwap (NoOp + Queue)  │
│           │              ├─ executeQueuedSwap (RSC CB) │
│           │              └─ expireOrder (Fallback)     │
│           │                                            │
│           └─ ExecutionConfig (AI scores + pool config) │
└────────────────────────────────────────────────────────┘
        ▲                           │
        │ Callback                  │ Events
        │                           ▼
┌───────┴────────────────────────────────────────────────┐
│  REACTIVE NETWORK (Chain ID: 1597)                     │
│                                                        │
│  ExecutionOracle RSC                                   │
│  ├─ Subscribes: Unichain + Ethereum + Arbitrum events  │
│  ├─ Computes cross-chain execution score               │
│  └─ Emits Callback when score > threshold              │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│  AI ENGINE (Python / FastAPI)                          │
│  ├─ Transformer Encoder (70% weight)                   │
│  ├─ Random Forest (30% weight)                         │
│  └─ Execution Score: 0–100                             │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js + wagmi)                            │
│  ├─ Swap interface with queue warnings                 │
│  ├─ Order queue dashboard                              │
│  └─ AI score gauge + analytics                         │
└────────────────────────────────────────────────────────┘
```

## How It Works

1. **Submit** — Trader submits a large swap on Uniswap v4
2. **Queue** — SwapPilotHook NoOps the swap, queues the order, holds tokens safely
3. **Monitor** — RSC monitors swap/liquidity events across 3 chains
4. **Score** — AI engine scores execution conditions (0–100)
5. **Execute** — When score ≥ 70, RSC triggers callback → swap executes at optimal moment
6. **Fallback** — After 30 minutes, anyone can expire the order (tokens returned)

---

## Project Structure

```
swappilot/
├── contracts/          # Foundry — Solidity smart contracts
│   ├── src/hook/       # SwapPilotHook (Uniswap v4 Hook)
│   ├── src/oracle/     # ExecutionConfig
│   ├── src/rsc/        # ExecutionOracle (Reactive Network RSC)
│   ├── src/libraries/  # OrderLib, VolatilityLib, Constants
│   ├── test/           # Unit + integration tests (75 tests)
│   └── script/         # Deployment scripts
├── ai-engine/          # Python — AI execution predictor
│   ├── src/models/     # Transformer + RF + Ensemble
│   ├── src/features/   # Feature extraction
│   ├── src/server/     # FastAPI inference server
│   └── tests/          # Python tests (34 tests)
├── frontend/           # Next.js — Web interface
│   ├── src/app/        # Pages (swap, queue, analytics)
│   ├── src/components/ # React components
│   ├── src/hooks/      # Custom wagmi hooks
│   └── __tests__/      # Frontend tests (44 tests)
├── docs/               # Documentation
├── scripts/            # Integration scripts
└── .github/workflows/  # CI/CD
```

## Deployment

See the full [Deployment Guide](docs/deployment-guide.md).

```bash
# Deploy contracts to Unichain
make deploy-unichain

# Deploy RSC to Reactive Network
make deploy-rsc

# Sync ABIs to frontend
make sync-abis

# Build frontend
make frontend-build
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Chain | Unichain (L2, Chain ID 130) |
| AMM | Uniswap v4 (PoolManager + NoOp Hook) |
| Automation | Reactive Network (RSC, Chain ID 1597) |
| Contracts | Solidity ^0.8.26 / Foundry |
| AI Model | PyTorch Transformer + scikit-learn RF |
| AI Server | FastAPI + uvicorn |
| Frontend | Next.js 16 + TypeScript + Tailwind CSS v4 |
| Web3 | wagmi + viem + RainbowKit |
| Testing | Foundry (75) + pytest (34) + Jest (44) |

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment Guide](docs/deployment-guide.md)
- [Reactive Integration](docs/reactive-integration.md)
- [AI Model Spec](docs/ai-model-spec.md)
- [API Reference](docs/api-reference.md)

## License

[MIT](LICENSE)

---

Built for the Atrium Academy UHI8 Hookathon — Uniswap v4 Async Execution Hook + Reactive Network + AI
