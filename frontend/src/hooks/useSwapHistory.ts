"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbiItem, formatUnits } from "viem";
import { HOOK_ADDRESS } from "@/lib/constants";

export interface SwapHistoryEntry {
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
  sender: `0x${string}`;
  amount0: bigint;
  amount1: bigint;
  poolId: `0x${string}`;
}

const SWAP_EXECUTED_EVENT = parseAbiItem(
  "event SwapExecuted(bytes32 indexed poolId, address indexed sender, int256 amount0, int256 amount1)"
);

export function useSwapHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [swaps, setSwaps] = useState<SwapHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!publicClient || !address) {
      setSwaps([]);
      return;
    }

    let cancelled = false;

    async function fetchHistory() {
      setIsLoading(true);
      try {
        const currentBlock = await publicClient!.getBlockNumber();
        // Look back ~50k blocks (roughly a few days on Unichain Sepolia)
        const fromBlock = currentBlock > 50000n ? currentBlock - 50000n : 0n;

        const logs = await publicClient!.getLogs({
          address: HOOK_ADDRESS,
          event: SWAP_EXECUTED_EVENT,
          args: { sender: address },
          fromBlock,
          toBlock: "latest",
        });

        if (cancelled) return;

        const entries: SwapHistoryEntry[] = logs.map((log) => ({
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: 0, // will be populated below
          sender: (log.args as { sender: `0x${string}` }).sender,
          amount0: (log.args as { amount0: bigint }).amount0,
          amount1: (log.args as { amount1: bigint }).amount1,
          poolId: (log.args as { poolId: `0x${string}` }).poolId,
        }));

        // Fetch block timestamps for each unique block
        const uniqueBlocks = [...new Set(entries.map((e) => e.blockNumber))];
        const blockTimeMap = new Map<bigint, number>();
        await Promise.all(
          uniqueBlocks.map(async (bn) => {
            try {
              const block = await publicClient!.getBlock({ blockNumber: bn });
              blockTimeMap.set(bn, Number(block.timestamp));
            } catch {
              blockTimeMap.set(bn, Math.floor(Date.now() / 1000));
            }
          }),
        );

        for (const entry of entries) {
          entry.timestamp = blockTimeMap.get(entry.blockNumber) ?? 0;
        }

        if (!cancelled) {
          setSwaps(entries.reverse()); // newest first
        }
      } catch (err) {
        console.error("Failed to fetch swap history:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [publicClient, address]);

  return { swaps, isLoading, refetch: () => {} };
}
