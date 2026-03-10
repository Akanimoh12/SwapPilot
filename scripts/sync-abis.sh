#!/usr/bin/env bash
# sync-abis.sh — Extract ABI fields from Foundry artifacts and copy to frontend
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS="$ROOT/contracts"
FRONTEND="$ROOT/frontend/src/config/abis"

echo "Building contracts..."
cd "$CONTRACTS" && forge build --silent

echo "Extracting ABIs..."

# Extract only the "abi" field from the full Foundry JSON artifact
jq '.abi' "$CONTRACTS/out/SwapPilotHook.sol/SwapPilotHook.json" > "$FRONTEND/SwapPilotHook.json"
jq '.abi' "$CONTRACTS/out/ExecutionConfig.sol/ExecutionConfig.json" > "$FRONTEND/ExecutionConfig.json"

echo "✓ ABIs synced to frontend/src/config/abis/"
echo "  - SwapPilotHook.json  ($(wc -l < "$FRONTEND/SwapPilotHook.json") lines)"
echo "  - ExecutionConfig.json ($(wc -l < "$FRONTEND/ExecutionConfig.json") lines)"
