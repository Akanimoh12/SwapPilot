"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SWAPPILOT_HOOK } from "@/lib/contracts";

// ── Reads ──────────────────────────────────────────────

export function useQueueLength(poolId: `0x${string}`) {
  return useReadContract({
    ...SWAPPILOT_HOOK,
    functionName: "getQueueLength",
    args: [poolId],
    query: { refetchInterval: 5_000 },
  });
}

export function useOrder(poolId: `0x${string}`, orderIndex: bigint) {
  return useReadContract({
    ...SWAPPILOT_HOOK,
    functionName: "getOrder",
    args: [poolId, orderIndex],
  });
}

export function useTotalOrdersQueued() {
  return useReadContract({
    ...SWAPPILOT_HOOK,
    functionName: "totalOrdersQueued",
    query: { refetchInterval: 10_000 },
  });
}

export function useTotalOrdersExecuted() {
  return useReadContract({
    ...SWAPPILOT_HOOK,
    functionName: "totalOrdersExecuted",
    query: { refetchInterval: 10_000 },
  });
}

// ── Writes ─────────────────────────────────────────────

export function useExpireOrder() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  function write(poolId: `0x${string}`, orderIndex: bigint) {
    writeContract({
      ...SWAPPILOT_HOOK,
      functionName: "expireOrder",
      args: [poolId, orderIndex],
    });
  }

  return { write, hash, isPending, isSuccess, isConfirming, isConfirmed, error };
}
