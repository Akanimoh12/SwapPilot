"use client";

import { useState, useCallback } from "react";
import { useWatchContractEvent } from "wagmi";
import { SWAPPILOT_HOOK } from "@/lib/contracts";

export interface ContractEvent {
  type: "OrderQueued" | "OrderExecuted" | "OrderExpired";
  orderId: bigint;
  trader: `0x${string}`;
  timestamp: number;
  extra?: Record<string, unknown>;
}

const MAX_EVENTS = 100;

// Helper to safely extract args from log entries
function getArgs(log: unknown): Record<string, unknown> {
  if (log && typeof log === "object" && "args" in log) {
    return (log as { args: Record<string, unknown> }).args;
  }
  return {};
}

export function useContractEvents() {
  const [events, setEvents] = useState<ContractEvent[]>([]);

  const push = useCallback((evt: ContractEvent) => {
    setEvents((prev) => [evt, ...prev].slice(0, MAX_EVENTS));
  }, []);

  useWatchContractEvent({
    ...SWAPPILOT_HOOK,
    eventName: "OrderQueued",
    onLogs(logs) {
      for (const log of logs) {
        const args = getArgs(log);
        push({
          type: "OrderQueued",
          orderId: (args.orderId as bigint) ?? 0n,
          trader: (args.trader as `0x${string}`) ?? "0x0",
          timestamp: Number((args.queuedAt as bigint) ?? 0n),
          extra: { poolId: args.poolId, amount: args.amount, zeroForOne: args.zeroForOne },
        });
      }
    },
  });

  useWatchContractEvent({
    ...SWAPPILOT_HOOK,
    eventName: "OrderExecuted",
    onLogs(logs) {
      for (const log of logs) {
        const args = getArgs(log);
        push({
          type: "OrderExecuted",
          orderId: (args.orderId as bigint) ?? 0n,
          trader: (args.trader as `0x${string}`) ?? "0x0",
          timestamp: Math.floor(Date.now() / 1000),
          extra: {
            aiScore: Number((args.aiScore as bigint) ?? 0n),
            actualSlippage: Number((args.actualSlippage as bigint) ?? 0n),
            waitTimeSeconds: Number((args.waitTimeSeconds as bigint) ?? 0n),
          },
        });
      }
    },
  });

  useWatchContractEvent({
    ...SWAPPILOT_HOOK,
    eventName: "OrderExpired",
    onLogs(logs) {
      for (const log of logs) {
        const args = getArgs(log);
        push({
          type: "OrderExpired",
          orderId: (args.orderId as bigint) ?? 0n,
          trader: (args.trader as `0x${string}`) ?? "0x0",
          timestamp: Math.floor(Date.now() / 1000),
        });
      }
    },
  });

  return { events };
}
