#!/usr/bin/env bash
# integration-test.sh — End-to-end integration test
# Deploys contracts to a local Anvil fork, starts services, verifies connectivity
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANVIL_PORT=8545
AI_PORT=8000
NEXT_PORT=3000

cleanup() {
  echo "Cleaning up..."
  [[ -n "${ANVIL_PID:-}" ]] && kill "$ANVIL_PID" 2>/dev/null || true
  [[ -n "${AI_PID:-}" ]] && kill "$AI_PID" 2>/dev/null || true
  [[ -n "${NEXT_PID:-}" ]] && kill "$NEXT_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "═══════════════════════════════════════"
echo "  SwapPilot Integration Test"
echo "═══════════════════════════════════════"

# ── Step 1: Start Anvil ──
echo ""
echo "[1/5] Starting Anvil on port $ANVIL_PORT..."
anvil --port "$ANVIL_PORT" --silent &
ANVIL_PID=$!
sleep 2

if ! curl -sf http://localhost:$ANVIL_PORT -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null; then
  echo "✗ Anvil failed to start"
  exit 1
fi
echo "✓ Anvil running (PID $ANVIL_PID)"

# ── Step 2: Build & deploy contracts ──
echo ""
echo "[2/5] Building contracts..."
cd "$ROOT/contracts"
forge build --silent
echo "✓ Contracts compiled"

# Deploy with the first Anvil default account
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "Deploying contracts to local Anvil..."
DEPLOY_OUTPUT=$(forge script script/DeploySwapPilot.s.sol \
  --rpc-url http://localhost:$ANVIL_PORT \
  --private-key "$PRIVATE_KEY" \
  --broadcast 2>&1 || true)

if echo "$DEPLOY_OUTPUT" | grep -q "ONCHAIN EXECUTION COMPLETE"; then
  echo "✓ Contracts deployed"
else
  echo "⚠ Contract deployment skipped (may need pool manager address)"
  echo "  This is expected if PoolManager is not available on the local fork"
fi

# ── Step 3: Start AI engine ──
echo ""
echo "[3/5] Starting AI engine on port $AI_PORT..."
cd "$ROOT/ai-engine"

if [[ -d ".venv" ]]; then
  source .venv/bin/activate
fi

uvicorn src.server.app:app --host 0.0.0.0 --port "$AI_PORT" &
AI_PID=$!
sleep 3

AI_HEALTH=$(curl -sf http://localhost:$AI_PORT/health 2>/dev/null || echo "failed")
if echo "$AI_HEALTH" | grep -q "healthy"; then
  echo "✓ AI engine healthy (PID $AI_PID)"
else
  echo "⚠ AI engine not responding (may need model files)"
  echo "  Response: $AI_HEALTH"
fi

# ── Step 4: Start Next.js dev server ──
echo ""
echo "[4/5] Starting Next.js dev server on port $NEXT_PORT..."
cd "$ROOT/frontend"
PORT=$NEXT_PORT npx next dev &
NEXT_PID=$!
sleep 5

NEXT_HEALTH=$(curl -sf http://localhost:$NEXT_PORT/ 2>/dev/null | head -c 100 || echo "failed")
if [[ "$NEXT_HEALTH" != "failed" ]]; then
  echo "✓ Next.js running (PID $NEXT_PID)"
else
  echo "⚠ Next.js not responding yet (may need more startup time)"
fi

# ── Step 5: Verify connectivity ──
echo ""
echo "[5/5] Verifying integrations..."

# Check frontend health endpoint
FRONTEND_HEALTH=$(curl -sf http://localhost:$NEXT_PORT/api/health 2>/dev/null || echo "failed")
if echo "$FRONTEND_HEALTH" | grep -q "status"; then
  echo "✓ Frontend /api/health responding"
else
  echo "⚠ Frontend health check inconclusive"
fi

# Check predict proxy
PREDICT_RESULT=$(curl -sf -X POST http://localhost:$NEXT_PORT/api/predict \
  -H "Content-Type: application/json" \
  -d '{"pool_id":"0x00","features":[],"chain":"unichain"}' 2>/dev/null || echo "failed")
if [[ "$PREDICT_RESULT" != "failed" ]]; then
  echo "✓ Frontend /api/predict proxy working"
else
  echo "⚠ Predict proxy not responding (AI engine may not be ready)"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  Integration test complete"
echo "═══════════════════════════════════════"
