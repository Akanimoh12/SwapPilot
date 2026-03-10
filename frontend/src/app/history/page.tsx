import { ExecutionHistory } from "@/components/analytics/ExecutionHistory";

export default function HistoryPage() {
  return (
    <div className="bg-hero-gradient mx-auto max-w-7xl px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">Execution History</h1>
      <p className="mb-8 text-sm text-muted">
        Complete log of all executed and expired orders.
      </p>
      <ExecutionHistory pageSize={20} />
    </div>
  );
}
