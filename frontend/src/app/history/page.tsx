"use client";

import { SwapHistoryTable } from "@/components/analytics/SwapHistoryTable";

export default function HistoryPage() {
  return (
    <div className="bg-hero-gradient mx-auto max-w-7xl px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">Swap History</h1>
      <p className="mb-8 text-sm text-muted">
        Your recent swaps on SwapPilot.
      </p>
      <SwapHistoryTable />
    </div>
  );
}
