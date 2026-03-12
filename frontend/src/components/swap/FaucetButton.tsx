"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { useEffect } from "react";
import { Droplets } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

const MINT_ABI = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const FAUCET_TOKENS = [
  {
    symbol: "mUSDC",
    address: "0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C" as `0x${string}`,
    decimals: 6,
    amount: "1000",
  },
  {
    symbol: "mDAI",
    address: "0x7d1dea64e891dccb20f85bC379227238c8C1308b" as `0x${string}`,
    decimals: 18,
    amount: "1000",
  },
];

export function FaucetButton() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) toast.success("Tokens minted! Check your balance.");
    if (error) toast.error(`Mint failed: ${error.message.slice(0, 80)}`);
  }, [isSuccess, error]);

  const isLoading = isPending || isConfirming;

  function handleMint(token: (typeof FAUCET_TOKENS)[number]) {
    if (!address) return;
    writeContract({
      address: token.address,
      abi: MINT_ABI,
      functionName: "mint",
      args: [address, parseUnits(token.amount, token.decimals)],
    });
  }

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2">
      <Droplets size={14} className="text-accent" />
      <span className="text-xs text-muted">Faucet:</span>
      {FAUCET_TOKENS.map((t) => (
        <button
          key={t.symbol}
          onClick={() => handleMint(t)}
          disabled={isLoading}
          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10 disabled:opacity-50"
        >
          {isLoading ? <Spinner size="sm" /> : `Get ${t.symbol}`}
        </button>
      ))}
    </div>
  );
}
