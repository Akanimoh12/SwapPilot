"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface AIScoreGaugeProps {
  score: number;
  className?: string;
}

export function AIScoreGauge({ score, className }: AIScoreGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));

  const { label, color, ring } = useMemo(() => {
    if (clamped >= 70)
      return { label: "Execute", color: "text-success", ring: "stroke-success" };
    if (clamped >= 40)
      return { label: "Wait", color: "text-warning", ring: "stroke-warning" };
    return { label: "Avoid", color: "text-danger", ring: "stroke-danger" };
  }, [clamped]);

  // SVG arc parameters for a semi-circle gauge
  const radius = 70;
  const circumference = Math.PI * radius; // half-circle
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <svg viewBox="0 0 160 100" className="w-48">
        {/* Background arc */}
        <path
          d="M 10 90 A 70 70 0 0 1 150 90"
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Foreground arc */}
        <path
          d="M 10 90 A 70 70 0 0 1 150 90"
          fill="none"
          className={ring}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        {/* Score text */}
        <text
          x="80"
          y="78"
          textAnchor="middle"
          className={cn("text-3xl font-bold", color)}
          fill="currentColor"
        >
          {clamped}
        </text>
      </svg>
      <span className={cn("text-sm font-semibold", color)}>{label}</span>
    </div>
  );
}
