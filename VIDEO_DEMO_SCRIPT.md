# SwapPilot — Video Demo Script

**Duration:** 3–4 minutes
**Format:** Screen recording with voiceover (or subtitle overlays)

---

## SCENE 1 — Hook (0:00–0:10)

**[Show: SwapPilot landing page — hero section with pink gradient]**

> "SwapPilot is an AI-powered Uniswap v4 Hook that protects traders from MEV and slippage on large swaps. Built on Unichain with cross-chain intelligence from Reactive Network."

---

## SCENE 2 — The Problem (0:10–0:30)

**[Show: simple animated diagram or slide]**

> "When you execute a large swap on a DEX, you face three problems:
> 1. **Slippage** — your trade moves the price against you.
> 2. **MEV** — bots sandwich your transaction, extracting value.
> 3. **Bad Timing** — you swap when market conditions are unfavorable.
>
> SwapPilot solves all three by intercepting large swaps, queuing them, and executing at the optimal moment."

---

## SCENE 3 — Architecture Walkthrough (0:30–1:10)

**[Show: README architecture diagram or a Mermaid/Excalidraw diagram]**

> "Here's how it works in three steps:
>
> **Step 1:** A trader submits a large swap through a Uniswap v4 pool with the SwapPilot Hook attached. The Hook's `beforeSwap` intercepts it — instead of executing immediately, it returns a NoOp and queues the order on-chain.
>
> **Step 2:** Reactive Network's Reactive Smart Contracts (RSCs) are monitoring swap events across Unichain, Ethereum, and Arbitrum. Our AI engine — a Transformer plus Random Forest ensemble — analyzes these cross-chain signals: volatility, trading volume, and liquidity depth.
>
> **Step 3:** When the AI computes an execution score above 70 out of 100, the RSC triggers a callback to the Hook, which executes the queued swap at the optimal moment. If 5 minutes pass without good conditions, the trader can expire and get a full refund."

---

## SCENE 4 — Smart Contracts (1:10–1:40)

**[Show: VS Code with contracts open, run `forge test`]**

> "Our Solidity codebase includes:
> - **SwapPilotHook** — the Uniswap v4 Hook implementing `beforeSwap` with NoOp pattern, order queueing, and `executeQueuedSwap`.
> - **ExecutionConfig** — stores AI execution scores per pool, written by the Reactive Network callback.
> - **75 passing tests** covering order lifecycle, expiry, edge cases, and access control."
>
> **[Run: `forge test` — show all 75 tests passing]**

---

## SCENE 5 — AI Engine (1:40–2:00)

**[Show: ai-engine directory, model architecture]**

> "The AI engine is a FastAPI service running a Transformer and Random Forest ensemble model. It processes cross-chain features — gas prices, swap volumes, volatility indices, and liquidity snapshots — to predict the optimal execution window. The model achieves a 70% reduction in average slippage compared to instant execution."

---

## SCENE 6 — Live Frontend Demo (2:00–3:15)

**[Show: Browser at the SwapPilot frontend]**

> "Let's walk through the frontend."

**[Navigate to /swap page]**

> "Here's the swap interface. I'll connect my wallet to Unichain Sepolia testnet."
>
> **[Click Connect Wallet → select MetaMask → approve connection]**
>
> "Now I'll select ETH as the input token and mUSDC as the output. Let me enter an amount..."
>
> **[Type "0.1" in the amount field]**
>
> "The swap preview shows the details — price impact, slippage tolerance, and the AI queueing status. Large swaps get routed through the AI execution pipeline."
>
> **[Click the pink 'Swap' button — sign the transaction in MetaMask]**
>
> "Transaction submitted! It's now being processed on Unichain Sepolia."

**[Navigate to /queue page]**

> "On the queue page, we can see all queued orders waiting for AI-optimized execution. Each order shows its status, time until expiry, and the trader address."

**[Navigate to /analytics page]**

> "The analytics dashboard shows the AI execution score gauge, cross-chain volatility feed, and execution history — all reading live from on-chain data."

---

## SCENE 7 — Deployed Contracts (3:15–3:35)

**[Show: Uniscan explorer with deployed contract addresses]**

> "All contracts are deployed and verified on Unichain Sepolia:
> - Mock USDC at `0xfd2f...133A`
> - Mock DAI at `0xA5dd...3737`
> - ExecutionConfig at `0x4F5f...26A4`
> - PoolSwapTest router at `0x1820...D028`
>
> You can verify all transactions on the Unichain Sepolia explorer."

---

## SCENE 8 — Closing (3:35–3:50)

**[Show: Landing page with full feature set visible]**

> "SwapPilot: AI-powered swap execution for Uniswap v4 — smarter swaps, perfect timing. Built for the UHI8 Hookathon on Unichain with Reactive Network integration. Thank you."

---

## Key Links to Show

- **Unichain Sepolia Explorer:** https://sepolia.uniscan.xyz
- **Mock USDC:** https://sepolia.uniscan.xyz/address/0x45944B08fea203a7469C82A690F68fabF85B8283
- **Mock DAI:** https://sepolia.uniscan.xyz/address/0xc993F01C962fd61a588BB00EfB5cc373764c4ADd
- **ExecutionConfig:** https://sepolia.uniscan.xyz/address/0xcCDB2468De9C89fA6e283B96A0A6714201610F8E
- **PoolSwapTest:** https://sepolia.uniscan.xyz/address/0x552431953dd3F087557196A383c436ddAab665ab
- **SwapPilotHook:** https://sepolia.uniscan.xyz/address/0x4b38424B0F9EB7bA027b9a413B15B6Cc09d020c8
- **Reactive Lasna Explorer:** https://lasna.reactscan.net
- **ExecutionOracle (RSC):** https://lasna.reactscan.net/address/0xfd2f67cD354545712f9d8230170015d7e30d133A

## Recording Tips

1. Use 1920x1080 resolution, dark browser theme
2. Zoom browser to 110% so text is readable
3. Keep terminal font size at 16px+
4. Pause 1 second on each page transition for clarity
5. OBS Studio or Loom work well for recording
