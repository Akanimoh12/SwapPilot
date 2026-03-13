"use client";

import { useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";

interface UseTokenBalanceReturn {
  balance: bigint;
  formatted: string;
  isLoading: boolean;
  refetch: () => void;
}

export function useTokenBalance(
  token: `0x${string}`,
  account: `0x${string}` | undefined,
  decimals = 18,
): UseTokenBalanceReturn {
  const {
    data: rawBalance,
    isLoading,
    refetch,
  } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!account && !!token, refetchInterval: 8_000 },
  });

  const raw = (rawBalance as bigint) ?? 0n;
  const full = formatUnits(raw, decimals);
  // Show up to 4 decimals for 18-dec tokens, 2 for 6-dec, trim trailing zeros
  const maxDecimals = decimals > 6 ? 4 : 2;
  const num = parseFloat(full);
  const formatted = num === 0 ? "0" : num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });

  return {
    balance: raw,
    formatted,
    isLoading,
    refetch,
  };
}
