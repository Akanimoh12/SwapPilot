# SwapPilot — Project Structure

Professional monorepo structure for building the SwapPilot Uniswap v4 Async Execution Hook with Reactive Network and AI.

---

## Root Structure

```
swappilot/
├── .github/
│   └── workflows/
│       ├── contracts.yml              # CI: forge build + test
│       ├── ai-engine.yml              # CI: pytest + lint
│       └── frontend.yml               # CI: next build + test
├── contracts/                         # Foundry workspace — all Solidity
│   ├── foundry.toml
│   ├── remappings.txt
│   ├── .env.example
│   ├── lib/                           # Foundry dependencies (git submodules)
│   │   ├── forge-std/
│   │   ├── v4-core/
│   │   ├── v4-periphery/
│   │   ├── openzeppelin-contracts/
│   │   └── reactive-lib/             # Reactive Network contracts library
│   ├── src/
│   │   ├── hook/
│   │   │   ├── SwapPilotHook.sol      # Main Uniswap v4 hook contract
│   │   │   └── interfaces/
│   │   │       └── ISwapPilotHook.sol # Hook interface
│   │   ├── oracle/
│   │   │   ├── ExecutionConfig.sol    # On-chain config + AI score storage
│   │   │   └── interfaces/
│   │   │       └── IExecutionConfig.sol
│   │   ├── rsc/
│   │   │   ├── ExecutionOracle.sol    # Reactive Smart Contract (RSC)
│   │   │   └── interfaces/
│   │   │       └── IExecutionOracle.sol
│   │   └── libraries/
│   │       ├── OrderLib.sol           # QueuedOrder struct + helpers
│   │       ├── VolatilityLib.sol      # Volatility math utilities
│   │       └── Constants.sol          # Chain IDs, event topics, addresses
│   ├── script/
│   │   ├── DeploySwapPilot.s.sol      # Deploy hook + config to Unichain
│   │   ├── DeployRSC.s.sol            # Deploy RSC to Reactive Network
│   │   ├── CreatePool.s.sol           # Initialize a Uniswap v4 pool with hook
│   │   ├── QueueSwap.s.sol            # Test: submit a large swap to queue
│   │   └── HelperConfig.s.sol         # Network-specific config (RPC, addresses)
│   └── test/
│       ├── unit/
│       │   ├── SwapPilotHook.t.sol    # Hook logic unit tests
│       │   ├── ExecutionConfig.t.sol  # Config contract unit tests
│       │   ├── OrderLib.t.sol         # Library unit tests
│       │   └── VolatilityLib.t.sol    # Math library tests
│       ├── integration/
│       │   ├── HookLifecycle.t.sol    # Full hook lifecycle (init → queue → execute)
│       │   ├── NoOpFlow.t.sol         # NoOp + queue + expiry flow
│       │   └── CallbackAuth.t.sol     # RSC callback authentication tests
│       ├── fork/
│       │   └── UnichainFork.t.sol     # Fork tests against live Unichain state
│       ├── invariant/
│       │   └── QueueInvariant.t.sol   # Invariant: no funds lost, all orders resolve
│       └── mocks/
│           ├── MockCallbackProxy.sol  # Mock Reactive Network callback proxy
│           ├── MockPoolManager.sol    # Mock PoolManager for unit tests
│           └── MockERC20.sol          # Test tokens
├── ai-engine/                         # Python AI volatility/execution predictor
│   ├── pyproject.toml                 # Python project config (uv/pip)
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile                     # Containerized inference server
│   ├── src/
│   │   ├── __init__.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── transformer.py         # LSTM/Transformer execution predictor
│   │   │   ├── random_forest.py       # Random Forest fallback model
│   │   │   └── ensemble.py            # Ensemble combiner (0.7T + 0.3RF)
│   │   ├── features/
│   │   │   ├── __init__.py
│   │   │   ├── extractor.py           # Feature extraction from RSC events
│   │   │   ├── preprocessor.py        # Normalization, scaling, cyclical encoding
│   │   │   └── cross_chain.py         # Cross-chain spread + divergence calc
│   │   ├── data/
│   │   │   ├── __init__.py
│   │   │   ├── collector.py           # Fetch historical swap data (subgraph/RPC)
│   │   │   ├── labeler.py             # Label optimal execution blocks
│   │   │   └── dataset.py             # PyTorch Dataset class
│   │   ├── training/
│   │   │   ├── __init__.py
│   │   │   ├── train.py               # Training loop + checkpointing
│   │   │   ├── evaluate.py            # Model evaluation + metrics
│   │   │   └── hyperparams.py         # Hyperparameter config
│   │   ├── inference/
│   │   │   ├── __init__.py
│   │   │   ├── predictor.py           # Load model + predict execution score
│   │   │   └── fee_mapper.py          # Map volatility score → action
│   │   ├── server/
│   │   │   ├── __init__.py
│   │   │   ├── app.py                 # FastAPI server entry point
│   │   │   ├── routes.py              # API endpoints (/predict, /health, /metrics)
│   │   │   └── middleware.py          # CORS, logging, rate limiting
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── logger.py              # Structured logging
│   │       ├── config.py              # Environment config loader
│   │       └── web3_client.py         # Web3 client for pushing tx to RSC
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_transformer.py        # Model architecture tests
│   │   ├── test_ensemble.py           # Ensemble prediction tests
│   │   ├── test_features.py           # Feature extraction tests
│   │   ├── test_labeler.py            # Labeling logic tests
│   │   └── test_api.py                # FastAPI endpoint tests
│   ├── notebooks/
│   │   ├── 01_data_exploration.ipynb  # EDA on historical swap data
│   │   ├── 02_feature_engineering.ipynb # Feature correlation analysis
│   │   ├── 03_model_training.ipynb    # Interactive training + visualization
│   │   └── 04_backtest.ipynb          # Backtest SwapPilot vs. instant execution
│   ├── data/
│   │   ├── raw/                       # Raw fetched data (gitignored)
│   │   ├── processed/                 # Processed feature datasets
│   │   └── models/                    # Saved model checkpoints (.pt, .pkl)
│   └── scripts/
│       ├── fetch_data.py              # Fetch swap data from subgraph
│       ├── train_model.py             # CLI training entry point
│       └── backtest.py                # Run backtest simulation
├── frontend/                          # Next.js 14 App Router frontend
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── .env.local.example
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   └── og-image.png
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout (providers, fonts, metadata)
│   │   │   ├── page.tsx               # Landing / swap page
│   │   │   ├── globals.css            # Global styles + Tailwind imports
│   │   │   ├── swap/
│   │   │   │   └── page.tsx           # Swap interface (queue large swaps)
│   │   │   ├── queue/
│   │   │   │   └── page.tsx           # Order queue dashboard
│   │   │   ├── history/
│   │   │   │   └── page.tsx           # Execution history + analytics
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx           # AI scores, slippage savings charts
│   │   │   └── api/
│   │   │       ├── predict/
│   │   │       │   └── route.ts       # Proxy to AI engine /predict
│   │   │       └── health/
│   │   │           └── route.ts       # Health check endpoint
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx         # Navigation header
│   │   │   │   ├── Footer.tsx         # Footer
│   │   │   │   └── Sidebar.tsx        # Sidebar nav (swap, queue, history)
│   │   │   ├── swap/
│   │   │   │   ├── SwapForm.tsx       # Token input, amount, slippage config
│   │   │   │   ├── SwapPreview.tsx    # Preview: threshold check, queue warning
│   │   │   │   ├── SwapButton.tsx     # Submit swap / queue transaction
│   │   │   │   └── TokenSelector.tsx  # Token picker modal
│   │   │   ├── queue/
│   │   │   │   ├── OrderQueue.tsx     # List of queued orders
│   │   │   │   ├── OrderCard.tsx      # Individual order status card
│   │   │   │   ├── OrderStatus.tsx    # Status badge (queued/monitoring/executed)
│   │   │   │   └── ExpireButton.tsx   # Manual expire order button
│   │   │   ├── analytics/
│   │   │   │   ├── AIScoreGauge.tsx   # Real-time AI execution score gauge
│   │   │   │   ├── SlippageChart.tsx  # Slippage saved over time chart
│   │   │   │   ├── VolatilityFeed.tsx # Cross-chain volatility indicator
│   │   │   │   └── ExecutionHistory.tsx # Past executions table
│   │   │   ├── wallet/
│   │   │   │   ├── ConnectButton.tsx  # Wallet connect button
│   │   │   │   └── NetworkBadge.tsx   # Current chain indicator
│   │   │   └── ui/                    # Reusable UI primitives
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Spinner.tsx
│   │   │       ├── Toast.tsx
│   │   │       └── Skeleton.tsx
│   │   ├── hooks/
│   │   │   ├── useSwapPilot.ts        # Hook contract read/write interactions
│   │   │   ├── useOrderQueue.ts       # Fetch + subscribe to queued orders
│   │   │   ├── useExecutionConfig.ts  # Read config (threshold, maxQueue)
│   │   │   ├── useAIScore.ts          # Poll AI execution score from API
│   │   │   ├── useTokenBalance.ts     # Token balance for connected wallet
│   │   │   └── useContractEvents.ts   # Subscribe to on-chain events
│   │   ├── lib/
│   │   │   ├── contracts.ts           # Contract ABIs + addresses per chain
│   │   │   ├── wagmi.ts               # Wagmi config (chains, transports)
│   │   │   ├── constants.ts           # App-wide constants
│   │   │   ├── utils.ts               # Formatting, conversion helpers
│   │   │   └── types.ts               # TypeScript types (Order, PoolConfig, etc.)
│   │   ├── providers/
│   │   │   ├── Web3Provider.tsx       # WagmiProvider + QueryClientProvider
│   │   │   └── ThemeProvider.tsx      # Dark/light theme provider
│   │   └── config/
│   │       ├── chains.ts              # Unichain chain config
│   │       ├── tokens.ts              # Supported token list
│   │       └── abis/
│   │           ├── SwapPilotHook.json # Hook ABI (auto-generated from forge)
│   │           └── ExecutionConfig.json # Config ABI
│   └── __tests__/
│       ├── components/
│       │   ├── SwapForm.test.tsx
│       │   ├── OrderQueue.test.tsx
│       │   └── AIScoreGauge.test.tsx
│       └── hooks/
│           ├── useSwapPilot.test.ts
│           └── useOrderQueue.test.ts
├── docs/
│   ├── architecture.md                # Detailed architecture document
│   ├── deployment-guide.md            # Step-by-step deployment instructions
│   ├── reactive-integration.md        # Reactive Network integration details
│   ├── ai-model-spec.md               # AI model specification
│   └── api-reference.md               # AI engine API docs
├── .gitignore
├── .gitmodules                        # Foundry lib submodules
├── LICENSE
├── README.md                          # Main project README (from SwapPilot.md)
├── Makefile                           # Top-level commands for all workspaces
└── docker-compose.yml                 # Local dev: AI engine + optional services
```

---

## Detailed File Descriptions

### `/contracts` — Foundry Smart Contract Workspace

#### `foundry.toml`
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.26"
optimizer = true
optimizer_runs = 200
ffi = true
fs_permissions = [{ access = "read-write", path = "./"}]

[profile.default.fuzz]
runs = 256

[profile.default.invariant]
runs = 128
depth = 50

[rpc_endpoints]
unichain = "${UNICHAIN_RPC_URL}"
unichain_testnet = "${UNICHAIN_TESTNET_RPC_URL}"
reactive = "https://mainnet-rpc.rnk.dev/"
reactive_testnet = "https://lasna-rpc.rnk.dev/"

[etherscan]
unichain = { key = "${ETHERSCAN_API_KEY}" }
```

#### `remappings.txt`
```
forge-std/=lib/forge-std/src/
@uniswap/v4-core/=lib/v4-core/
@uniswap/v4-periphery/=lib/v4-periphery/
@openzeppelin/=lib/openzeppelin-contracts/
@reactive-network/=lib/reactive-lib/
```

#### Key Contracts

| File | Purpose |
|---|---|
| `src/hook/SwapPilotHook.sol` | Main hook — `beforeSwap` (NoOp + queue), `afterSwap` (emit data), `executeQueuedSwap` (RSC callback), `expireOrder` (fallback) |
| `src/oracle/ExecutionConfig.sol` | Stores pool config (threshold, maxQueueTime, maxSlippage), AI execution scores, receives RSC callbacks |
| `src/rsc/ExecutionOracle.sol` | Reactive Smart Contract — subscribes to events on 3 chains, computes execution scores, sends callbacks |
| `src/libraries/OrderLib.sol` | `QueuedOrder` struct, encoding/decoding, status helpers |
| `src/libraries/VolatilityLib.sol` | Volatility computation, slippage estimation math |
| `src/libraries/Constants.sol` | Chain IDs, callback proxy address, event topic hashes |

#### Test Strategy

| Test Type | File | What It Tests |
|---|---|---|
| **Unit** | `SwapPilotHook.t.sol` | Individual hook functions in isolation |
| **Unit** | `ExecutionConfig.t.sol` | Config storage, callback auth, bounds |
| **Unit** | `OrderLib.t.sol` | Order struct helpers, encoding |
| **Integration** | `HookLifecycle.t.sol` | Full flow: init pool → submit swap → queue → RSC callback → execute |
| **Integration** | `NoOpFlow.t.sol` | Large swap NoOp'd, small swap pass-through, expiry fallback |
| **Integration** | `CallbackAuth.t.sol` | Only callback proxy can execute, unauthorized calls revert |
| **Fork** | `UnichainFork.t.sol` | Fork live Unichain and test against real PoolManager |
| **Invariant** | `QueueInvariant.t.sol` | Every order eventually resolves (executed or expired), no token loss |

---

### `/ai-engine` — Python AI Execution Predictor

#### `pyproject.toml`
```toml
[project]
name = "swappilot-ai"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "torch>=2.2.0",
    "numpy>=1.26.0",
    "scikit-learn>=1.4.0",
    "pandas>=2.2.0",
    "fastapi>=0.110.0",
    "uvicorn>=0.27.0",
    "httpx>=0.27.0",
    "web3>=6.15.0",
    "python-dotenv>=1.0.0",
    "pydantic>=2.6.0",
    "structlog>=24.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.3.0",
    "mypy>=1.8.0",
    "jupyter>=1.0.0",
    "matplotlib>=3.8.0",
    "seaborn>=0.13.0",
]
```

#### Key Modules

| Module | File | Purpose |
|---|---|---|
| **Transformer** | `src/models/transformer.py` | PyTorch Transformer encoder for sequential market analysis |
| **Random Forest** | `src/models/random_forest.py` | scikit-learn RF for interpretable predictions |
| **Ensemble** | `src/models/ensemble.py` | 70/30 weighted combiner, threshold logic |
| **Feature Extractor** | `src/features/extractor.py` | Parse RSC event data into 10-feature vectors |
| **Cross-Chain** | `src/features/cross_chain.py` | Compute cross-chain spread, divergence metrics |
| **Data Collector** | `src/data/collector.py` | Fetch swap data from Uniswap subgraph + RPC |
| **Labeler** | `src/data/labeler.py` | Label optimal vs. suboptimal execution blocks |
| **Predictor** | `src/inference/predictor.py` | Load saved model, run inference, return score |
| **FastAPI Server** | `src/server/app.py` | HTTP API for inference (`POST /predict`) |
| **Web3 Client** | `src/utils/web3_client.py` | Sign + send fee update transactions to RSC |

#### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `POST /predict` | POST | Receive features, return execution score + action |
| `GET /health` | GET | Server health check |
| `GET /metrics` | GET | Model performance metrics |
| `GET /status` | GET | Current model version, last prediction time |

---

### `/frontend` — Next.js 14 App Router

#### `package.json` (key dependencies)
```json
{
  "name": "swappilot-frontend",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "wagmi": "^2.12.0",
    "viem": "^2.21.0",
    "@tanstack/react-query": "^5.50.0",
    "@rainbow-me/rainbowkit": "^2.1.0",
    "tailwindcss": "^3.4.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "zustand": "^4.5.0",
    "sonner": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.14.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.3.0"
  }
}
```

#### Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — hero, stats, CTA to swap |
| `/swap` | `app/swap/page.tsx` | Main swap interface with queue preview |
| `/queue` | `app/queue/page.tsx` | Live order queue dashboard |
| `/history` | `app/history/page.tsx` | Past execution history with details |
| `/analytics` | `app/analytics/page.tsx` | AI scores, volatility charts, slippage savings |

#### Key Components

| Component | Purpose |
|---|---|
| `SwapForm.tsx` | Token pair selector, amount input, slippage tolerance, hook data config |
| `SwapPreview.tsx` | Shows if swap will be queued (threshold check), estimated wait, AI conditions |
| `OrderQueue.tsx` | Real-time queue of pending orders with status badges |
| `OrderCard.tsx` | Individual order: trader, amount, queued time, AI score, countdown to expiry |
| `AIScoreGauge.tsx` | Circular gauge showing current AI execution score (0–100) |
| `SlippageChart.tsx` | Recharts line chart: slippage saved per execution over time |
| `VolatilityFeed.tsx` | 3-chain volatility bars (Unichain, Ethereum, Arbitrum) |
| `ConnectButton.tsx` | RainbowKit wallet connect with Unichain network switching |

---

### Root Configuration Files

#### `Makefile`
```makefile
# ═══════════════════════════════════
#  SwapPilot — Top-Level Commands
# ═══════════════════════════════════

# Contracts
build:
	cd contracts && forge build

test:
	cd contracts && forge test -vvv

test-fork:
	cd contracts && forge test --fork-url $(UNICHAIN_RPC_URL) -vvv

deploy-unichain:
	cd contracts && forge script script/DeploySwapPilot.s.sol \
		--rpc-url $(UNICHAIN_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --verify

deploy-rsc:
	cd contracts && forge script script/DeployRSC.s.sol \
		--rpc-url https://mainnet-rpc.rnk.dev/ --private-key $(PRIVATE_KEY) --broadcast

# AI Engine
ai-install:
	cd ai-engine && pip install -e ".[dev]"

ai-train:
	cd ai-engine && python scripts/train_model.py

ai-serve:
	cd ai-engine && uvicorn src.server.app:app --host 0.0.0.0 --port 8000 --reload

ai-test:
	cd ai-engine && pytest tests/ -v --cov=src

# Frontend
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

frontend-test:
	cd frontend && npm test

# All
install: ai-install frontend-install
	cd contracts && forge install

test-all: test ai-test frontend-test

# ABI export (contracts → frontend)
sync-abis:
	cd contracts && forge build
	cp contracts/out/SwapPilotHook.sol/SwapPilotHook.json frontend/src/config/abis/SwapPilotHook.json
	cp contracts/out/ExecutionConfig.sol/ExecutionConfig.json frontend/src/config/abis/ExecutionConfig.json
	@echo "✓ ABIs synced to frontend"
```

#### `docker-compose.yml`
```yaml
version: "3.9"
services:
  ai-engine:
    build: ./ai-engine
    ports:
      - "8000:8000"
    env_file:
      - ./ai-engine/.env
    volumes:
      - ./ai-engine/data/models:/app/data/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### `.gitignore`
```gitignore
# Foundry
contracts/out/
contracts/cache/
contracts/lib/
broadcast/

# AI Engine
ai-engine/data/raw/
ai-engine/data/models/*.pt
ai-engine/data/models/*.pkl
ai-engine/__pycache__/
ai-engine/.venv/
*.pyc

# Frontend
frontend/node_modules/
frontend/.next/
frontend/out/

# Environment
.env
.env.local
*.env

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

---

## Development Flow

### 1. Setup & Install
```bash
git clone https://github.com/your-username/swappilot.git
cd swappilot
make install            # Install all workspace dependencies
cp contracts/.env.example contracts/.env
cp ai-engine/.env.example ai-engine/.env
cp frontend/.env.local.example frontend/.env.local
```

### 2. Build & Test Contracts
```bash
make build              # forge build
make test               # forge test -vvv
make test-fork          # Fork test against live Unichain
```

### 3. Train AI Model
```bash
make ai-install         # Install Python dependencies
cd ai-engine
python scripts/fetch_data.py     # Fetch historical swap data
python scripts/train_model.py    # Train Transformer + RF
```

### 4. Run Frontend
```bash
make sync-abis          # Copy ABIs from contracts → frontend
make frontend-dev       # next dev on localhost:3000
```

### 5. Deploy
```bash
make deploy-unichain    # Deploy hook + config to Unichain
make deploy-rsc         # Deploy RSC to Reactive Network
make ai-serve           # Start AI inference server
make frontend-build     # Build frontend for Vercel
```

---

## Environment Variables

### `contracts/.env`
```env
UNICHAIN_RPC_URL=https://mainnet.unichain.org
UNICHAIN_TESTNET_RPC_URL=https://sepolia.unichain.org
REACTIVE_RPC_URL=https://mainnet-rpc.rnk.dev/
REACTIVE_TESTNET_RPC_URL=https://lasna-rpc.rnk.dev/
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
POOL_MANAGER_ADDRESS=0x...
CALLBACK_PROXY_ADDRESS=0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4
```

### `ai-engine/.env`
```env
UNICHAIN_RPC_URL=https://mainnet.unichain.org
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/...
UNISWAP_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3
MODEL_PATH=data/models/execution_predictor.pt
REACTIVE_RPC_URL=https://mainnet-rpc.rnk.dev/
PRIVATE_KEY=0x...
LOG_LEVEL=INFO
```

### `frontend/.env.local`
```env
NEXT_PUBLIC_UNICHAIN_RPC_URL=https://mainnet.unichain.org
NEXT_PUBLIC_SWAPPILOT_HOOK_ADDRESS=0x...
NEXT_PUBLIC_EXECUTION_CONFIG_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:8000
```
