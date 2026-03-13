<div align="center">

# SwapPilot

**AI-Powered Asynchronous Swap Execution for Uniswap v4**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Unichain](https://img.shields.io/badge/Chain-Unichain%20Sepolia-7B3FE4)](https://sepolia.uniscan.xyz)
[![Reactive Network](https://img.shields.io/badge/Automation-Reactive%20Network-00C2FF)](https://reactive.network)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.26-363636)](https://soliditylang.org)

[Live Demo](https://swappilot.vercel.app) · [Demo Video](https://youtu.be/swappilot-demo) · [Docs](docs/)

</div>

---

## What is SwapPilot?

SwapPilot is a **Uniswap v4 Hook** that intercepts large swaps, queues them via the NoOp pattern, and executes at the AI-predicted optimal moment — minimizing slippage, price impact, and MEV exposure.

**Reactive Network RSCs** monitor cross-chain swap activity (Ethereum, Unichain, Arbitrum) in real-time. When the AI model detects optimal conditions, the RSC triggers a callback to execute the queued swap autonomously.

> **Built for:** Atrium Academy UHI8 Hookathon — Specialized Markets Track  
> **Sponsor Integration:** Reactive Network

---

## How It Works

```
Trader → Uniswap v4 Pool → SwapPilotHook (NoOp + Queue)
                                    ↓
                           ExecutionConfig (AI Scores)
                                    ↑
                      Reactive Network RSC (Cross-chain Monitor)
                                    ↑
                           AI Engine (Transformer + RF Ensemble)
```

1. **Submit** — Trader sends a large swap through the Uniswap v4 pool
2. **Queue** — Hook NoOps the AMM swap, queues the order, holds tokens via ERC-6909 claims
3. **Monitor** — RSC subscribes to swap events across 3 chains
4. **Score** — AI engine scores execution conditions (0–100)
5. **Execute** — Score ≥ 70 triggers callback → swap executes at optimal moment
6. **Fallback** — Orders auto-expire after 5 minutes (tokens refunded)

---

## Deployed Contracts

### Unichain Sepolia (Chain ID: 1301)

| Contract | Address | Explorer |
|---|---|---|
| PoolManager | `0x7c13D90950F542B297179e09f3A36EaA917A40C1` | [View](https://unichain-sepolia.blockscout.com/address/0x7c13D90950F542B297179e09f3A36EaA917A40C1) |
| **SwapPilotHook** | `0xCB611482dC1112f768B965d655d83b1DbcF420c8` | [View](https://unichain-sepolia.blockscout.com/address/0xCB611482dC1112f768B965d655d83b1DbcF420c8) |
| ExecutionConfig | `0xe8cf0aCE4A7f5b940c3Cab327117045C03b79Ac3` | [View](https://unichain-sepolia.blockscout.com/address/0xe8cf0aCE4A7f5b940c3Cab327117045C03b79Ac3) |
| PoolSwapTest | `0xd48ee69b1206c3fdD17E5668A2725E10c2B0f11D` | [View](https://unichain-sepolia.blockscout.com/address/0xd48ee69b1206c3fdD17E5668A2725E10c2B0f11D) |
| Mock USDC | `0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C` | [View](https://unichain-sepolia.blockscout.com/address/0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C) |
| Mock DAI | `0x7d1dea64e891dccb20f85bC379227238c8C1308b` | [View](https://unichain-sepolia.blockscout.com/address/0x7d1dea64e891dccb20f85bC379227238c8C1308b) |

### Reactive Lasna Testnet (Chain ID: 5318007)

| Contract | Address | Explorer |
|---|---|---|
| ExecutionOracle RSC | `0xfd2f67cD354545712f9d8230170015d7e30d133A` | [View](https://lasna.reactscan.net/address/0xfd2f67cD354545712f9d8230170015d7e30d133A) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Hook | Uniswap v4 (NoOp + BeforeSwapReturnDelta) |
| Chain | Unichain Sepolia (L2) |
| Automation | Reactive Network RSC |
| Contracts | Solidity ^0.8.26 · Foundry |
| AI Model | PyTorch Transformer + scikit-learn Random Forest |
| API | FastAPI + uvicorn |
| Frontend | Next.js 16 · TypeScript · Tailwind CSS v4 |
| Web3 | wagmi v3 · viem · RainbowKit |

---

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) · [Node.js 20+](https://nodejs.org/) · [Python 3.11+](https://python.org/)

### Install & Run

```bash
git clone https://github.com/AkanniData/SwapPilot.git
cd SwapPilot

# Contracts
cd contracts && forge install && forge build && forge test

# AI Engine
cd ../ai-engine && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn src.server.main:app --port 8000

# Frontend
cd ../frontend && npm install && npm run dev
# Open http://localhost:3000
```

### Testing

```bash
cd contracts && forge test          # 75 Solidity tests
cd ai-engine && pytest              # 34 Python tests
cd frontend && npm test             # 44 Jest tests
```

---

## Project Structure

```
SwapPilot/
├── contracts/                 # Foundry workspace
│   ├── src/hook/              # SwapPilotHook (Uniswap v4 Hook)
│   ├── src/oracle/            # ExecutionConfig (AI scores + pool config)
│   ├── src/rsc/               # ExecutionOracle (Reactive Network RSC)
│   ├── src/libraries/         # OrderLib, VolatilityLib, Constants
│   ├── script/                # Deployment & initialization scripts
│   └── test/                  # Unit + integration tests
├── ai-engine/                 # Python AI predictor
│   ├── src/models/            # Transformer + RF + Ensemble
│   ├── src/features/          # Feature extraction pipeline
│   └── src/server/            # FastAPI inference server
├── frontend/                  # Next.js web app
│   ├── src/app/               # Pages (swap, queue, analytics, history)
│   ├── src/components/        # React components
│   └── src/hooks/             # Custom wagmi hooks
└── docs/                      # Architecture & deployment docs
```

---

## Key Features

- **NoOp Pattern** — Large swaps are intercepted and queued instead of executing immediately
- **AI Execution Scoring** — Transformer + Random Forest ensemble predicts optimal execution windows
- **Cross-Chain Intelligence** — RSC monitors Ethereum, Unichain, and Arbitrum swap events in real-time
- **MEV Protection** — Queued orders avoid sandwich attacks and front-running
- **ERC-6909 Claims** — Tokens held safely in PoolManager during queue period
- **Auto-Expiry** — Orders that exceed the queue window are automatically refundable
- **Token Faucet** — Built-in testnet faucet for mUSDC and mDAI
- **Live Analytics** — Real-time AI score gauge, volatility feed, and execution history

---

## License

[MIT](LICENSE)

---

<div align="center">
Built for the <strong>Atrium Academy UHI8 Hookathon</strong> — Uniswap v4 × Reactive Network
</div>
