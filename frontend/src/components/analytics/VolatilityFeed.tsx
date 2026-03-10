"use client";

import { cn } from "@/lib/utils";

interface ChainVolatility {
  name: string;
  volatility: number; // 0–100
}

interface VolatilityFeedProps {
  data?: ChainVolatility[];
  className?: string;
}

const DEFAULT_DATA: ChainVolatility[] = [
  { name: "Unichain", volatility: 0 },
  { name: "Ethereum", volatility: 0 },
  { name: "Arbitrum", volatility: 0 },
];

function barColor(v: number) {
  if (v < 30) return "bg-success";
  if (v < 60) return "bg-warning";
  return "bg-danger";
}

function labelColor(v: number) {
  if (v < 30) return "text-success";
  if (v < 60) return "text-warning";
  return "text-danger";
}

export function VolatilityFeed({ data = DEFAULT_DATA, className }: VolatilityFeedProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <h3 className="mb-4 text-sm font-semibold">Cross-Chain Volatility</h3>
      <div className="space-y-4">
        {data.map(({ name, volatility }) => (
          <div key={name} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{name}</span>
              <span className={cn("text-xs font-semibold", labelColor(volatility))}>
                {volatility.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/20">
              <div
                className={cn("h-full rounded-full transition-all", barColor(volatility))}
                style={{ width: `${Math.min(100, volatility)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
