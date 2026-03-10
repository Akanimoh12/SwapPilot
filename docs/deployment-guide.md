# SwapPilot — Deployment Guide

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Foundry | stable | Smart contract compilation & deployment |
| Node.js | 20+ | Frontend build |
| Python | 3.11+ | AI engine |
| jq | any | ABI extraction (sync-abis) |

You also need:

- **Unichain RPC URL** — `https://mainnet.unichain.org` or an Alchemy/Infura endpoint
- **Reactive Network RPC** — `https://mainnet-rpc.rnk.dev/`
- **Deployer private key** with ETH on both Unichain and Reactive Network
- **WalletConnect Project ID** (for frontend wallet connectivity)

## Step 1: Deploy Contracts to Unichain

```bash
cd contracts

# Set environment
cp .env.example .env
# Edit .env with your values:
#   UNICHAIN_RPC_URL=https://mainnet.unichain.org
#   PRIVATE_KEY=0x...
#   POOL_MANAGER_ADDRESS=0x...  (Uniswap v4 PoolManager on Unichain)
#   CALLBACK_PROXY_ADDRESS=0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4

# Build
forge build

# Deploy ExecutionConfig + SwapPilotHook
forge script script/DeploySwapPilot.s.sol \
  --rpc-url $UNICHAIN_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Note the deployed addresses from the output
```

Record the deployed addresses:

- `SWAPPILOT_HOOK_ADDRESS` — SwapPilotHook contract
- `EXECUTION_CONFIG_ADDRESS` — ExecutionConfig contract

## Step 2: Deploy RSC to Reactive Network

```bash
# Deploy ExecutionOracle RSC
forge script script/DeployRSC.s.sol \
  --rpc-url https://mainnet-rpc.rnk.dev/ \
  --private-key $PRIVATE_KEY \
  --broadcast

# The RSC constructor auto-subscribes to events on all 3 chains
```

## Step 3: Configure Pool on ExecutionConfig

```bash
# Create a pool with the hook attached
forge script script/CreatePool.s.sol \
  --rpc-url $UNICHAIN_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

This script:
1. Creates a PoolKey with the hook address and fee
2. Calls `PoolManager.initialize()` to create the pool
3. Adds initial liquidity

## Step 4: Train and Deploy AI Model

```bash
cd ai-engine

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Set environment
cp .env.example .env
# Edit .env:
#   UNICHAIN_RPC_URL=...
#   ETHEREUM_RPC_URL=...
#   ARBITRUM_RPC_URL=...
#   MODEL_PATH=data/models/execution_predictor.pt

# Fetch training data
python scripts/fetch_data.py --pool 0x... --chain ethereum --blocks 100000

# Train model
python scripts/train_model.py --data-dir data/processed --model-dir data/models --epochs 100

# Verify model
python scripts/backtest.py --data-dir data/processed --model-dir data/models

# Start inference server
uvicorn src.server.app:app --host 0.0.0.0 --port 8000
```

For production, use the provided Dockerfile:

```bash
docker build -t swappilot-ai .
docker run -p 8000:8000 --env-file .env swappilot-ai
```

## Step 5: Deploy Frontend to Vercel

```bash
cd frontend

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_UNICHAIN_RPC_URL=https://mainnet.unichain.org
#   NEXT_PUBLIC_SWAPPILOT_HOOK_ADDRESS=0x...  (from Step 1)
#   NEXT_PUBLIC_EXECUTION_CONFIG_ADDRESS=0x...  (from Step 1)
#   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
#   NEXT_PUBLIC_AI_ENGINE_URL=https://your-ai-engine.com

# Build and test locally
npm install
npm run build
npm run start

# Deploy to Vercel
npx vercel --prod
```

Configure the same environment variables in Vercel's dashboard under Project Settings → Environment Variables.

## Environment Variable Reference

### contracts/.env

| Variable | Description | Example |
|---|---|---|
| `UNICHAIN_RPC_URL` | Unichain mainnet RPC | `https://mainnet.unichain.org` |
| `UNICHAIN_TESTNET_RPC_URL` | Unichain Sepolia testnet RPC | `https://sepolia.unichain.org` |
| `REACTIVE_RPC_URL` | Reactive Network RPC | `https://mainnet-rpc.rnk.dev/` |
| `PRIVATE_KEY` | Deployer private key | `0xac09...` |
| `ETHERSCAN_API_KEY` | For contract verification | — |
| `POOL_MANAGER_ADDRESS` | Uniswap v4 PoolManager on Unichain | `0x...` |
| `CALLBACK_PROXY_ADDRESS` | Reactive Network Callback Proxy | `0x9299...7FC4` |

### ai-engine/.env

| Variable | Description |
|---|---|
| `UNICHAIN_RPC_URL` | Unichain RPC for event queries |
| `ETHEREUM_RPC_URL` | Ethereum mainnet RPC |
| `ARBITRUM_RPC_URL` | Arbitrum One RPC |
| `MODEL_PATH` | Path to saved model checkpoint |
| `LOG_LEVEL` | Logging level (INFO, DEBUG) |

### frontend/.env.local

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_UNICHAIN_RPC_URL` | Unichain RPC for wagmi |
| `NEXT_PUBLIC_SWAPPILOT_HOOK_ADDRESS` | Deployed hook address |
| `NEXT_PUBLIC_EXECUTION_CONFIG_ADDRESS` | Deployed config address |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |
| `NEXT_PUBLIC_AI_ENGINE_URL` | AI engine base URL |

## Verification Commands

```bash
# Verify contracts on block explorer
forge verify-contract $SWAPPILOT_HOOK_ADDRESS SwapPilotHook \
  --rpc-url $UNICHAIN_RPC_URL --etherscan-api-key $ETHERSCAN_API_KEY

# Check AI engine health
curl http://localhost:8000/health

# Check frontend health
curl http://localhost:3000/api/health

# Run all tests
make test-all
```
