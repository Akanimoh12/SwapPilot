"use client";

import { ChevronDown, ChevronUp, Clock, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_POOL_ID } from "@/lib/constants";
import { useExecutionConfig } from "@/hooks/useExecutionConfig";
import { useAIScore } from "@/hooks/useAIScore";
import type { SwapFormData } from "@/lib/types";

interface SwapPreviewProps {
  formData: SwapFormData;
  willBeQueued: boolean;
}

export function SwapPreview({ formData, willBeQueued }: SwapPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const { maxQueueTime, maxSlippage, isActive } = useExecutionConfig(DEFAULT_POOL_ID);
  const { score, action } = useAIScore(DEFAULT_POOL_ID);

  return (
    <div className="rounded-2xl border border-border bg-background">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-xs text-muted"
      >
        <span>Swap Details</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border p-3 text-xs">
          <Row label="Input" value={`${formData.amountIn} ${formData.tokenIn?.symbol}`} />
          <Row label="Output (est.)" value={`— ${formData.tokenOut?.symbol}`} />
          <Row
            label="Price Impact"
            value="< 0.01%"
            className="text-success"
          />
          <Row
            label="Slippage Tolerance"
            value={`${(formData.slippageTolerance / 100).toFixed(1)}%`}
          />

          {willBeQueued && (
            <>
              <div className="my-2 border-t border-border" />
              <div className="flex items-center gap-1.5 text-accent">
                <Zap size={12} />
                <span className="font-medium">AI-Queued Execution</span>
              </div>
              <Row label="Est. Wait Time" value={`≤ ${Math.floor(maxQueueTime / 60)} min`} icon={<Clock size={12} />} />
              <Row label="Max Slippage" value={`${(maxSlippage / 100).toFixed(1)}%`} />
              <Row label="AI Score" value={`${score} — ${action}`} className={action === "execute" ? "text-success" : "text-warning"} />
              <Row label="Execution Trigger" value="AI Score ≥ 70" />
              <Row label="Fallback" value={`Auto-refund after ${Math.floor(maxQueueTime / 60)} min`} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn("flex items-center gap-1 font-medium text-foreground", className)}>
        {icon}
        {value}
      </span>
    </div>
  );
}
