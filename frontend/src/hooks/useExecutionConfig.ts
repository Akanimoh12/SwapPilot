"use client";

import { useReadContract } from "wagmi";
import { EXECUTION_CONFIG } from "@/lib/contracts";

export function useExecutionConfig(poolId: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    ...EXECUTION_CONFIG,
    functionName: "poolConfigs",
    args: [poolId],
    query: { refetchInterval: 30_000 },
  });

  // ABI returns: (queueThreshold, maxQueueTime, maxSlippage, isActive)
  const config = data as
    | readonly [bigint, bigint, bigint, boolean]
    | undefined;

  return {
    threshold: config?.[0] ?? 0n,
    maxQueueTime: Number(config?.[1] ?? 0n),
    maxSlippage: Number(config?.[2] ?? 0n),
    isActive: config?.[3] ?? false,
    isLoading,
    error: error as Error | null,
  };
}

export function useOnChainScore(poolId: `0x${string}`) {
  const { data, isLoading } = useReadContract({
    ...EXECUTION_CONFIG,
    functionName: "getExecutionScore",
    args: [poolId],
    query: { refetchInterval: 10_000 },
  });

  // Returns (score, updatedAt)
  const result = data as readonly [bigint, bigint] | undefined;

  return {
    score: Number(result?.[0] ?? 0n),
    updatedAt: Number(result?.[1] ?? 0n),
    isLoading,
  };
}

export function useShouldQueue(poolId: `0x${string}`, amount: bigint) {
  return useReadContract({
    ...EXECUTION_CONFIG,
    functionName: "shouldQueue",
    args: [poolId, amount],
    query: { enabled: amount > 0n },
  });
}
