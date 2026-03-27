"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { ArrowDownUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOKENS } from "@/config/tokens";
import { LARGE_SWAP_THRESHOLD_HUMAN } from "@/lib/constants";
import type { TokenInfo, SwapFormData } from "@/lib/types";
import { TokenSelector } from "./TokenSelector";
import { SwapPreview } from "./SwapPreview";
import { SwapButton } from "./SwapButton";
import { SwapSuccessModal } from "./SwapSuccessModal";
import { useTokenBalance } from "@/hooks/useTokenBalance";

// Pool fee is 3000 bps = 0.3%
const POOL_FEE_FRACTION = 0.003;

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
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    txHash?: `0x${string}`;
    amountIn?: string;
    estimatedOut?: string;
  }>({ open: false });

  const SLIPPAGE_OPTIONS = [10, 50, 100]; // 0.1%, 0.5%, 1%

  const willBeQueued = formData.amountIn ? parseFloat(formData.amountIn) >= LARGE_SWAP_THRESHOLD_HUMAN : false;

  // Estimate output: for the mUSDC/mDAI 1:1 pool, output ≈ input × (1 - fee)
  // adjusted for decimal differences between tokens
  const estimatedOutput = useMemo(() => {
    if (!formData.amountIn || Number(formData.amountIn) <= 0 || !formData.tokenIn || !formData.tokenOut) {
      return "";
    }
    const inputAmount = parseFloat(formData.amountIn);
    const outputAmount = inputAmount * (1 - POOL_FEE_FRACTION);
    const decimals = formData.tokenOut.decimals > 6 ? 4 : 2;
    return outputAmount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }, [formData.amountIn, formData.tokenIn, formData.tokenOut]);

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

  const refetchInRef = useRef(balanceIn.refetch);
  refetchInRef.current = balanceIn.refetch;
  const refetchOutRef = useRef(balanceOut.refetch);
  refetchOutRef.current = balanceOut.refetch;

  const handleSwapSuccess = useCallback((txHash: `0x${string}`) => {
    setSuccessModal({
      open: true,
      txHash,
      amountIn: formData.amountIn,
      estimatedOut: estimatedOutput,
    });
    // Clear the input
    setFormData((prev) => ({ ...prev, amountIn: "" }));
    // Refresh balances
    refetchInRef.current();
    refetchOutRef.current();
  }, [formData.amountIn, estimatedOutput]);

  return (
    <div className="w-full max-w-md space-y-3">
      {/* Token In */}
      <div className="rounded-2xl border border-border bg-card p-4 transition-colors focus-within:border-accent/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted">You pay</label>
          {isConnected && formData.tokenIn && (
            <button
              className="text-xs text-muted hover:text-accent"
              onClick={() => setFormData((prev) => ({ ...prev, amountIn: balanceIn.formatted.replace(/,/g, "") }))}
            >
              Balance: {balanceIn.formatted} {formData.tokenIn.symbol}
            </button>
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
            value={estimatedOutput}
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

      {/* Rate info */}
      {estimatedOutput && (
        <div className="flex items-center justify-between px-1 text-xs text-muted">
          <span>Rate</span>
          <span>
            1 {formData.tokenIn?.symbol} ≈ {(1 - POOL_FEE_FRACTION).toFixed(4)} {formData.tokenOut?.symbol}
          </span>
        </div>
      )}

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
        onSwapSuccess={handleSwapSuccess}
      />

      {/* Token selector modal */}
      {showTokenSelector && (
        <TokenSelector
          onSelect={handleTokenSelect}
          onClose={() => setShowTokenSelector(null)}
          exclude={showTokenSelector === "in" ? formData.tokenOut?.address : formData.tokenIn?.address}
        />
      )}

      {/* Swap success modal */}
      <SwapSuccessModal
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false })}
        txHash={successModal.txHash}
        tokenInSymbol={formData.tokenIn?.symbol}
        tokenOutSymbol={formData.tokenOut?.symbol}
        amountIn={successModal.amountIn}
        estimatedOut={successModal.estimatedOut}
      />
    </div>
  );
}
