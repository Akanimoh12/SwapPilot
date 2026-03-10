"use client";

import { useMemo } from "react";
import { useOrderQueue } from "@/hooks/useOrderQueue";
import { Inbox } from "lucide-react";
import { OrderCard } from "./OrderCard";
import { Spinner } from "@/components/ui/Spinner";

interface OrderQueueProps {
  poolId: `0x${string}`;
}

export function OrderQueue({ poolId }: OrderQueueProps) {
  const { orderIds, total, isLoading } = useOrderQueue(poolId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (orderIds.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted">
        <Inbox size={40} strokeWidth={1.5} />
        <p className="text-sm">No orders in the queue</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{total} total order(s)</p>
      {orderIds.map((id) => (
        <OrderCard key={id.toString()} orderIndex={id} poolId={poolId} />
      ))}
    </div>
  );
}
