"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

// Sample data shape — in production this comes from on-chain events
interface DataPoint {
  time: string;
  slippageSaved: number;
}

const RANGES = ["24h", "7d", "30d"] as const;
type Range = (typeof RANGES)[number];

interface SlippageChartProps {
  data?: DataPoint[];
  className?: string;
}

export function SlippageChart({ data = [], className }: SlippageChartProps) {
  const [range, setRange] = useState<Range>("7d");

  // Filter data based on range (simplified — real impl uses timestamps)
  const displayed = data.length > 0 ? data : SAMPLE_DATA;

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Slippage Saved</h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={displayed}>
          <defs>
            <linearGradient id="slippageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10 }}
            className="text-muted"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="text-muted"
            tickFormatter={(v: number) => `${v} bps`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="slippageSaved"
            stroke="var(--color-accent)"
            fill="url(#slippageGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Placeholder data for preview
const SAMPLE_DATA: DataPoint[] = Array.from({ length: 14 }, (_, i) => ({
  time: `Day ${i + 1}`,
  slippageSaved: Math.floor(Math.random() * 40 + 5),
}));
