import { SwapForm } from "@/components/swap/SwapForm";

export default function SwapPage() {
  return (
    <div className="bg-hero-gradient mx-auto flex max-w-7xl flex-col items-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">Swap</h1>
      <p className="mb-8 text-sm text-muted">
        Large swaps are automatically queued for AI-optimized execution.
      </p>
      <SwapForm />
    </div>
  );
}
