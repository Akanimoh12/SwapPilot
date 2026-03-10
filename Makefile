# ============================================================
# SwapPilot — Top-Level Makefile
# ============================================================

.PHONY: build test test-fork deploy-unichain deploy-rsc \
        ai-install ai-train ai-serve ai-test \
        frontend-install frontend-dev frontend-build frontend-test \
        install test-all sync-abis clean

# ------- Contracts (Foundry) -------
build:
	cd contracts && forge build

test:
	cd contracts && forge test -vvv

test-fork:
	cd contracts && forge test --fork-url $(UNICHAIN_RPC_URL) -vvv

deploy-unichain:
	cd contracts && forge script script/DeploySwapPilot.s.sol \
		--rpc-url $(UNICHAIN_RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast --verify

deploy-rsc:
	cd contracts && forge script script/DeployRSC.s.sol \
		--rpc-url $(REACTIVE_RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast

# ------- AI Engine (Python) -------
ai-install:
	cd ai-engine && python -m venv .venv && \
		. .venv/bin/activate && pip install -e ".[dev]"

ai-train:
	cd ai-engine && . .venv/bin/activate && python -m src.training.train

ai-serve:
	cd ai-engine && . .venv/bin/activate && \
		uvicorn src.server.app:app --host 0.0.0.0 --port 8000 --reload

ai-test:
	cd ai-engine && . .venv/bin/activate && pytest -v

# ------- Frontend (Next.js) -------
frontend-install:
	cd frontend && npm ci

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

frontend-test:
	cd frontend && npm test

# ------- Cross-Cutting -------
install: ai-install frontend-install
	cd contracts && forge install

test-all: test ai-test frontend-test

sync-abis:
	bash scripts/sync-abis.sh

clean:
	cd contracts && forge clean
	cd ai-engine && rm -rf .venv __pycache__ .pytest_cache
	cd frontend && rm -rf .next node_modules
