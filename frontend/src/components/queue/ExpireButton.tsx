"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useExpireOrder } from "@/hooks/useSwapPilot";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface ExpireButtonProps {
  orderIndex: bigint;
  poolId: `0x${string}`;
}

export function ExpireButton({ orderIndex, poolId }: ExpireButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const { write, isPending, isConfirmed, error } = useExpireOrder();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    write(poolId, orderIndex);
  }

  if (isConfirmed) {
    toast.success(`Order #${orderIndex.toString()} expired and refunded.`);
  }
  if (error) {
    toast.error(error.message.slice(0, 80));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        confirming
          ? "bg-danger text-white hover:bg-danger/90"
          : "border border-danger/40 text-danger hover:bg-danger/10",
      )}
    >
      {isPending ? (
        <Spinner size="xs" />
      ) : confirming ? (
        "Confirm Expire"
      ) : (
        "Expire & Refund"
      )}
    </button>
  );
}
