"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { SWAPPILOT_HOOK } from "@/lib/contracts";

interface UseOrderQueueReturn {
  orderIds: bigint[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOrderQueue(poolId: `0x${string}`): UseOrderQueueReturn {
  const {
    data: queueLength,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    ...SWAPPILOT_HOOK,
    functionName: "getQueueLength",
    args: [poolId],
    query: { refetchInterval: 5_000 },
  });

  const total = Number(queueLength ?? 0n);

  // Build order indices (newest first, cap at 50)
  const orderIds = useMemo(() => {
    const ids: bigint[] = [];
    const start = Math.max(0, total - 50);
    for (let i = total - 1; i >= start; i--) {
      ids.push(BigInt(i));
    }
    return ids;
  }, [total]);

  return {
    orderIds,
    total,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useSortedOrders(orderIds: bigint[]) {
  return useMemo(
    () => [...orderIds].sort((a, b) => Number(b - a)),
    [orderIds],
  );
}
