"use client";

import { cn } from "@/lib/utils";

interface NetworkBadgeProps {
  name: string;
  onClick?: () => void;
  className?: string;
}

// Colored dot based on network name
function dotColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("unichain")) return "bg-[#FF007A]";
  if (n.includes("ethereum") || n.includes("mainnet")) return "bg-[#627EEA]";
  if (n.includes("sepolia") || n.includes("goerli")) return "bg-yellow-400";
  return "bg-green-400";
}

export function NetworkBadge({ name, onClick, className }: NetworkBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium",
        "transition-colors hover:bg-card",
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotColor(name))} />
      {name}
    </button>
  );
}
