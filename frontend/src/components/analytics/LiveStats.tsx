"use client";

import { useTotalOrdersQueued, useTotalOrdersExecuted } from "@/hooks/useSwapPilot";
import { Activity, BarChart2, Shield } from "lucide-react";

export function LiveStats() {
  const { data: queued } = useTotalOrdersQueued();
  const { data: executed } = useTotalOrdersExecuted();

  const stats = [
    { label: "Orders Queued", value: queued ? Number(queued).toLocaleString() : "—", icon: Activity },
    { label: "Orders Executed", value: executed ? Number(executed).toLocaleString() : "—", icon: BarChart2 },
    { label: "MEV Protection", value: "Active", icon: Shield },
  ];

  return (
    <div className="glass-card grid grid-cols-3 divide-x divide-border rounded-2xl">
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex flex-col items-center gap-1.5 py-6">
          <Icon size={16} className="text-accent" />
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-xs text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}
