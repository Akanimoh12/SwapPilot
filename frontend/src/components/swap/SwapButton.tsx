"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, erc20Abi } from "viem";
import { toast } from "sonner";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { SWAP_ROUTER_ADDRESS, HOOK_ADDRESS } from "@/lib/constants";
import type { SwapFormData } from "@/lib/types";

// Uniswap v4 PoolSwapTest ABI
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
      {
        name: "testSettings",
        type: "tuple",
        components: [
          { name: "takeClaims", type: "bool" },
          { name: "settleUsingBurn", type: "bool" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
    stateMutability: "payable",
  },
] as const;

// MIN/MAX sqrt price limits (from Uniswap v4 constants)
const MIN_SQRT_PRICE = BigInt("4295128739") + 1n;
const MAX_SQRT_PRICE = BigInt("1461446703485210103287273052203988822378723970342") - 1n;

interface SwapButtonProps {
  formData: SwapFormData;
  willBeQueued: boolean;
  disabled: boolean;
}

export function SwapButton({ formData, willBeQueued, disabled }: SwapButtonProps) {
  const { isConnected, address: account } = useAccount();

  // Approval state
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Swap state
  const {
    writeContract: writeSwap,
    data: swapHash,
    isPending: isSwapPending,
    error: swapError,
  } = useWriteContract();
  const { isLoading: isSwapConfirming, isSuccess: isSwapSuccess } =
    useWaitForTransactionReceipt({ hash: swapHash });

  const amountWei = formData.amountIn && formData.tokenIn
    ? parseUnits(formData.amountIn, formData.tokenIn.decimals)
    : 0n;

  // Check allowance for the input ERC20 token
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: formData.tokenIn?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, SWAP_ROUTER_ADDRESS] : undefined,
    query: { enabled: !!account && !!formData.tokenIn },
  });

  const needsApproval = amountWei > 0n && (allowance ?? 0n) < amountWei;

  // Refetch allowance after approval succeeds
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      toast.success("Token approved!");
    }
    if (approveError) {
      toast.error(`Approval failed: ${approveError.message.slice(0, 80)}`);
    }
  }, [isApproveSuccess, approveError, refetchAllowance]);

  useEffect(() => {
    if (isSwapSuccess) {
      toast.success(willBeQueued ? "Order queued for smart execution!" : "Swap executed!");
    }
    if (swapError) {
      toast.error(`Swap failed: ${swapError.message.slice(0, 80)}`);
    }
  }, [isSwapSuccess, swapError, willBeQueued]);

  const isLoading = isApprovePending || isApproveConfirming || isSwapPending || isSwapConfirming;

  function handleApprove() {
    if (!formData.tokenIn) return;
    writeApprove({
      address: formData.tokenIn.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [SWAP_ROUTER_ADDRESS, amountWei * 10n], // approve 10x for convenience
    });
  }

  function handleSwap() {
    if (!formData.tokenIn || !formData.tokenOut || !formData.amountIn) return;

    // Sort tokens to determine zeroForOne
    const addr0 = formData.tokenIn.address.toLowerCase();
    const addr1 = formData.tokenOut.address.toLowerCase();
    const zeroForOne = addr0 < addr1;

    // Currency addresses sorted for PoolKey
    const [currency0, currency1] = zeroForOne
      ? [formData.tokenIn.address, formData.tokenOut.address]
      : [formData.tokenOut.address, formData.tokenIn.address];

    const sqrtPriceLimitX96 = zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE;

    writeSwap({
      address: SWAP_ROUTER_ADDRESS,
      abi: SWAP_ROUTER_ABI,
      functionName: "swap",
      args: [
        {
          currency0: currency0 as `0x${string}`,
          currency1: currency1 as `0x${string}`,
          fee: 3000,
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
    });
  }

  // Determine button label and action
  let label = "Swap";
  let onClick = handleSwap;

  if (!isConnected) {
    label = "Connect Wallet";
  } else if (isApprovePending || isApproveConfirming) {
    label = "Approving...";
  } else if (isSwapPending || isSwapConfirming) {
    label = "Confirming Swap...";
  } else if (needsApproval) {
    label = `Approve ${formData.tokenIn?.symbol}`;
    onClick = handleApprove;
  } else if (willBeQueued) {
    label = "Queue for Smart Execution";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading || !isConnected}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all",
        needsApproval
          ? "bg-yellow-600 text-white hover:bg-yellow-500"
          : "bg-accent text-white glow-pink hover:bg-accent-light",
        (disabled || !isConnected) && "cursor-not-allowed opacity-50 shadow-none",
      )}
    >
      {isLoading && <Spinner size="sm" className="text-white" />}
      {label}
    </button>
  );
}
