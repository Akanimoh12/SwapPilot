"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { ArrowDownUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOKENS } from "@/config/tokens";
import { LARGE_SWAP_THRESHOLD } from "@/lib/constants";
import type { TokenInfo, SwapFormData } from "@/lib/types";
import { TokenSelector } from "./TokenSelector";
import { SwapPreview } from "./SwapPreview";
import { SwapButton } from "./SwapButton";
import { useTokenBalance } from "@/hooks/useTokenBalance";

export function SwapForm() {
  const { isConnected, address: account } = useAccount();

  const [formData, setFormData] = useState<SwapFormData>({
    tokenIn: TOKENS[0],
    tokenOut: TOKENS[1],
    amountIn: "",
    slippageTolerance: 50, // 0.5%
  });

  const [showTokenSelector, setShowTokenSelector] = useState<"in" | "out" | null>(null);
  const [slippageOpen, setSlippageOpen] = useState(false);

  const SLIPPAGE_OPTIONS = [10, 50, 100]; // 0.1%, 0.5%, 1%

  // Compute the amount in wei
  const amountWei =
    formData.amountIn && formData.tokenIn
      ? parseUnits(formData.amountIn, formData.tokenIn.decimals)
      : 0n;

  const willBeQueued = amountWei >= LARGE_SWAP_THRESHOLD;

  const balanceIn = useTokenBalance(
    (formData.tokenIn?.address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    account,
    formData.tokenIn?.decimals,
  );
  const balanceOut = useTokenBalance(
    (formData.tokenOut?.address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    account,
    formData.tokenOut?.decimals,
  );

  function handleTokenSelect(token: TokenInfo) {
    if (showTokenSelector === "in") {
      setFormData((prev) => ({
        ...prev,
        tokenIn: token,
        tokenOut: prev.tokenOut?.address === token.address ? prev.tokenIn : prev.tokenOut,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        tokenOut: token,
        tokenIn: prev.tokenIn?.address === token.address ? prev.tokenOut : prev.tokenIn,
      }));
    }
    setShowTokenSelector(null);
  }

  function handleFlip() {
    setFormData((prev) => ({
      ...prev,
      tokenIn: prev.tokenOut,
      tokenOut: prev.tokenIn,
      amountIn: "",
    }));
  }

  return (
    <div className="w-full max-w-md space-y-3">
      {/* Token In */}
      <div className="rounded-2xl border border-border bg-card p-4 transition-colors focus-within:border-accent/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted">You pay</label>
          {isConnected && formData.tokenIn && (
            <span className="text-xs text-muted">
              Balance: {balanceIn.formatted} {formData.tokenIn.symbol}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={formData.amountIn}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              setFormData((prev) => ({ ...prev, amountIn: v }));
            }}
            className="w-full bg-transparent text-2xl font-medium outline-none placeholder:text-muted"
          />
          <button
            onClick={() => setShowTokenSelector("in")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-background"
          >
            {formData.tokenIn?.symbol ?? "Select"}
          </button>
        </div>
      </div>

      {/* Flip button */}
      <div className="flex justify-center">
        <button
          onClick={handleFlip}
          className="rounded-xl border border-border bg-card p-2 transition-colors hover:bg-background"
        >
          <ArrowDownUp size={16} className="text-muted" />
        </button>
      </div>

      {/* Token Out */}
      <div className="rounded-2xl border border-border bg-card p-4 transition-colors focus-within:border-accent/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted">You receive</label>
          {isConnected && formData.tokenOut && (
            <span className="text-xs text-muted">
              Balance: {balanceOut.formatted} {formData.tokenOut.symbol}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            placeholder="0.0"
            disabled
            className="w-full bg-transparent text-2xl font-medium outline-none placeholder:text-muted"
          />
          <button
            onClick={() => setShowTokenSelector("out")}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-background"
          >
            {formData.tokenOut?.symbol ?? "Select"}
          </button>
        </div>
      </div>

      {/* Slippage setting */}
      <div className="rounded-2xl border border-border bg-background p-3">
        <button
          onClick={() => setSlippageOpen(!slippageOpen)}
          className="flex w-full items-center justify-between text-xs text-muted"
        >
          <span>Slippage Tolerance</span>
          <span className="font-medium text-foreground">
            {(formData.slippageTolerance / 100).toFixed(1)}%
          </span>
        </button>
        {slippageOpen && (
          <div className="mt-2 flex gap-2">
            {SLIPPAGE_OPTIONS.map((bps) => (
              <button
                key={bps}
                onClick={() => setFormData((prev) => ({ ...prev, slippageTolerance: bps }))}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                  formData.slippageTolerance === bps
                    ? "bg-accent text-white"
                    : "bg-card text-muted hover:text-foreground",
                )}
              >
                {(bps / 100).toFixed(1)}%
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Queue warning */}
      {willBeQueued && formData.amountIn && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
          <p className="text-xs text-warning">
            This swap exceeds the threshold and will be queued for optimal
            AI-powered execution.
          </p>
        </div>
      )}

      {/* Preview */}
      {formData.amountIn && Number(formData.amountIn) > 0 && (
        <SwapPreview
          formData={formData}
          willBeQueued={willBeQueued}
        />
      )}

      {/* Action button */}
      <SwapButton
        formData={formData}
        willBeQueued={willBeQueued}
        disabled={!formData.amountIn || Number(formData.amountIn) <= 0}
      />

      {/* Token selector modal */}
      {showTokenSelector && (
        <TokenSelector
          onSelect={handleTokenSelect}
          onClose={() => setShowTokenSelector(null)}
          exclude={showTokenSelector === "in" ? formData.tokenOut?.address : formData.tokenIn?.address}
        />
      )}
    </div>
  );
}
