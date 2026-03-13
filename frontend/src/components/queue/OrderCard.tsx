"use client";

import { useOrder } from "@/hooks/useSwapPilot";
import { shortenAddress, timeAgo } from "@/lib/utils";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";
import { OrderStatusBadge, type DisplayStatus } from "./OrderStatus";
import { ExpireButton } from "./ExpireButton";
import { MAX_QUEUE_TIME } from "@/lib/constants";
import { Skeleton } from "@/components/ui/Skeleton";
import { TOKENS } from "@/config/tokens";

// OrderStatus enum: 0=Queued, 1=Executed, 2=Expired, 3=Cancelled
const STATUS_MAP: Record<number, DisplayStatus> = {
  0: "queued",
  1: "executed",
  2: "expired",
};

interface OrderCardProps {
  orderIndex: bigint;
  poolId: `0x${string}`;
}

export function OrderCard({ orderIndex, poolId }: OrderCardProps) {
  const { data, isLoading } = useOrder(poolId, orderIndex);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <Skeleton className="mb-2 h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (!data) return null;

  // QueuedOrder struct: (trader, poolKey, params, queuedAt, amountQueued, zeroForOne, status)
  const order = data as {
    trader: `0x${string}`;
    poolKey: { currency0: `0x${string}`; currency1: `0x${string}`; fee: number; tickSpacing: number; hooks: `0x${string}` };
    params: { zeroForOne: boolean; amountSpecified: bigint; sqrtPriceLimitX96: bigint };
    queuedAt: bigint;
    amountQueued: bigint;
    zeroForOne: boolean;
    status: number;
  };

  const queuedAtNum = Number(order.queuedAt);
  const expiryTime = queuedAtNum + MAX_QUEUE_TIME;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = now > expiryTime;

  let status: DisplayStatus = STATUS_MAP[order.status] ?? "queued";
  if (status === "queued" && isExpired) status = "expired";

  const borderColor: Record<DisplayStatus, string> = {
    queued: "border-warning/40",
    monitoring: "border-accent/40",
    executed: "border-success/40",
    expired: "border-danger/40",
  };

  // Determine the sell token from the pool key
  const sellAddress = order.zeroForOne
    ? order.poolKey.currency0.toLowerCase()
    : order.poolKey.currency1.toLowerCase();
  const sellToken = TOKENS.find((t) => t.address.toLowerCase() === sellAddress);
  const sellSymbol = sellToken?.symbol ?? "???";
  const sellDecimals = sellToken?.decimals ?? 18;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md",
        borderColor[status],
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Order #{orderIndex.toString()}</span>
            <OrderStatusBadge status={status} />
          </div>
          <p className="text-xs text-muted">
            {shortenAddress(order.trader)} · {order.zeroForOne ? "Sell" : "Buy"} · {formatUnits(order.amountQueued, sellDecimals)} {sellSymbol}
          </p>
          <p className="text-xs text-muted">Queued {timeAgo(queuedAtNum)}</p>
          {status === "queued" && !isExpired && (
            <p className="text-xs text-muted">
              Expires in {Math.max(0, Math.floor((expiryTime - now) / 60))}m{" "}
              {Math.max(0, (expiryTime - now) % 60)}s
            </p>
          )}
        </div>

        {status === "queued" && isExpired && (
          <ExpireButton orderIndex={orderIndex} poolId={poolId} />
        )}
      </div>
    </div>
  );
}
