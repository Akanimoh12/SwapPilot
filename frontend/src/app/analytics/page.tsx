"use client";

import { AIScoreGauge } from "@/components/analytics/AIScoreGauge";
import { SlippageChart } from "@/components/analytics/SlippageChart";
import { VolatilityFeed } from "@/components/analytics/VolatilityFeed";
import { ExecutionHistory } from "@/components/analytics/ExecutionHistory";
import { useAIScore } from "@/hooks/useAIScore";
import { DEFAULT_POOL_ID } from "@/lib/constants";

export default function AnalyticsPage() {
  const { score } = useAIScore(DEFAULT_POOL_ID);

  return (
    <div className="bg-hero-gradient mx-auto max-w-7xl space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted">Real-time AI execution metrics and market intelligence</p>
      </div>

      {/* Top row: gauge + volatility */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-6">
          <AIScoreGauge score={score} />
        </div>
        <VolatilityFeed />
      </div>

      {/* Slippage chart */}
      <SlippageChart />

      {/* History */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Execution History</h2>
        <ExecutionHistory />
      </div>
    </div>
  );
}
