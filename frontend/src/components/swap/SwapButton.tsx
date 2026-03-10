"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { SwapFormData } from "@/lib/types";

// Uniswap v4 UniversalRouter / PoolSwapTest ABI for swap
const SWAP_ROUTER_ABI = [
  {
    type: "function",
    name: "swap",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
      { name: "testSettings", type: "tuple", components: [
        { name: "takeClaims", type: "bool" },
        { name: "settleUsingBurn", type: "bool" },
      ]},
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
    stateMutability: "payable",
  },
] as const;

// PoolSwapTest router address — set via env var after deployment
const SWAP_ROUTER_ADDRESS = (process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS ??
  "0x552431953dd3F087557196A383c436ddAab665ab") as `0x${string}`;

const HOOK_ADDRESS = (process.env.NEXT_PUBLIC_SWAPPILOT_HOOK_ADDRESS ??
  "0x4b38424B0F9EB7bA027b9a413B15B6Cc09d020c8") as `0x${string}`;

// MIN/MAX sqrt price limits (from Uniswap v4 constants)
const MIN_SQRT_PRICE = BigInt("4295128739") + 1n;
const MAX_SQRT_PRICE = BigInt("1461446703485210103287273052203988822378723970342") - 1n;

interface SwapButtonProps {
  formData: SwapFormData;
  willBeQueued: boolean;
  disabled: boolean;
}

export function SwapButton({ formData, willBeQueued, disabled }: SwapButtonProps) {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success(willBeQueued ? "Order queued for smart execution!" : "Swap executed!");
    }
    if (error) {
      toast.error(error.message.slice(0, 80));
    }
  }, [isSuccess, error, willBeQueued]);

  const isLoading = isPending || isConfirming;

  function handleSwap() {
    if (!formData.tokenIn || !formData.tokenOut || !formData.amountIn) return;

    const amountWei = parseUnits(formData.amountIn, formData.tokenIn.decimals);

    // Sort tokens to determine zeroForOne
    const addr0 = formData.tokenIn.address.toLowerCase();
    const addr1 = formData.tokenOut.address.toLowerCase();
    const zeroForOne = addr0 < addr1;

    // Currency addresses sorted for PoolKey
    const [currency0, currency1] = zeroForOne
      ? [formData.tokenIn.address, formData.tokenOut.address]
      : [formData.tokenOut.address, formData.tokenIn.address];

    const sqrtPriceLimitX96 = zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE;

    writeContract({
      address: SWAP_ROUTER_ADDRESS,
      abi: SWAP_ROUTER_ABI,
      functionName: "swap",
      args: [
        {
          currency0: currency0 as `0x${string}`,
          currency1: currency1 as `0x${string}`,
          fee: 3000, // 0.3% fee tier
          tickSpacing: 60,
          hooks: HOOK_ADDRESS,
        },
        {
          zeroForOne,
          amountSpecified: -BigInt(amountWei), // negative = exact input
          sqrtPriceLimitX96,
        },
        { takeClaims: false, settleUsingBurn: false },
        "0x",
      ],
      value: formData.tokenIn.address === "0x0000000000000000000000000000000000000000"
        ? amountWei
        : 0n,
    });
  }

  // Determine button label
  let label = "Swap";
  if (!isConnected) label = "Connect Wallet";
  else if (isLoading) label = "Confirming...";
  else if (willBeQueued) label = "Queue for Smart Execution";

  return (
    <button
      onClick={handleSwap}
      disabled={disabled || isLoading || !isConnected}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all",
        willBeQueued
          ? "bg-accent text-white glow-pink hover:bg-accent-light"
          : "bg-accent text-white glow-pink hover:bg-accent-light",
        (disabled || !isConnected) && "cursor-not-allowed opacity-50 shadow-none",
      )}
    >
      {isLoading && <Spinner size="sm" className="text-white" />}
      {label}
    </button>
  );
}
