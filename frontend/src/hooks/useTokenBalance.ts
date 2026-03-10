"use client";

import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

interface UseTokenBalanceReturn {
  balance: bigint;
  formatted: string;
  symbol: string;
  isLoading: boolean;
}

export function useTokenBalance(
  token: `0x${string}`,
  account: `0x${string}` | undefined,
  decimals = 18,
): UseTokenBalanceReturn {
  const isNative = token === ZERO_ADDRESS;

  // Native ETH balance
  const {
    data: ethBalance,
    isLoading: ethLoading,
  } = useBalance({
    address: account,
    query: { enabled: isNative && !!account, refetchInterval: 10_000 },
  });

  // ERC-20 balance
  const {
    data: erc20Balance,
    isLoading: erc20Loading,
  } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !isNative && !!account, refetchInterval: 10_000 },
  });

  if (isNative) {
    const val = ethBalance?.value ?? 0n;
    const fmt = (Number(val) / 1e18).toFixed(4);
    return {
      balance: val,
      formatted: fmt,
      symbol: ethBalance?.symbol ?? "ETH",
      isLoading: ethLoading,
    };
  }

  const raw = (erc20Balance as bigint) ?? 0n;
  const formatted = (Number(raw) / 10 ** decimals).toFixed(
    decimals > 6 ? 4 : 2,
  );

  return {
    balance: raw,
    formatted,
    symbol: "",
    isLoading: erc20Loading,
  };
}
