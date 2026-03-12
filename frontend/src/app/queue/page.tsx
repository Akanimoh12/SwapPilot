import { OrderQueue } from "@/components/queue/OrderQueue";
import { DEFAULT_POOL_ID } from "@/lib/constants";

export default function QueuePage() {
  return (
    <div className="bg-hero-gradient mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">Order Queue</h1>
      <p className="mb-8 text-sm text-muted">
        Large swaps queued for AI-optimized execution. Expired orders can be
        refunded.
      </p>
      <OrderQueue poolId={DEFAULT_POOL_ID} />
    </div>
  );
}
