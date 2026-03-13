"use client";

import { CheckCircle, ExternalLink, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { LINKS } from "@/lib/constants";

interface SwapSuccessModalProps {
  open: boolean;
  onClose: () => void;
  txHash?: `0x${string}`;
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  amountIn?: string;
  estimatedOut?: string;
}

export function SwapSuccessModal({
  open,
  onClose,
  txHash,
  tokenInSymbol,
  tokenOutSymbol,
  amountIn,
  estimatedOut,
}: SwapSuccessModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        {/* Success icon with pulse animation */}
        <div className="relative mb-4">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
          <CheckCircle size={56} className="relative text-green-500" />
        </div>

        <h3 className="mb-1 text-xl font-bold text-foreground">
          Swap Successful!
        </h3>
        <p className="mb-5 text-sm text-muted">
          Your tokens have been swapped
        </p>

        {/* Swap summary */}
        {amountIn && tokenInSymbol && tokenOutSymbol && (
          <div className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
            <span className="text-sm font-semibold">
              {amountIn} {tokenInSymbol}
            </span>
            <ArrowRight size={16} className="text-accent" />
            <span className="text-sm font-semibold">
              {estimatedOut ? `~${estimatedOut}` : ""} {tokenOutSymbol}
            </span>
          </div>
        )}

        {/* View on explorer */}
        {txHash && (
          <a
            href={`${LINKS.blockExplorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            View on Explorer <ExternalLink size={13} />
          </a>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
