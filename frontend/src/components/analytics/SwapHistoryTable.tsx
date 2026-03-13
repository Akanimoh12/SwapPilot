"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { formatUnits } from "viem";
import { useSwapHistory } from "@/hooks/useSwapHistory";
import { shortenAddress, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { LINKS } from "@/lib/constants";
import { TOKENS } from "@/config/tokens";

// mUSDC is currency0, mDAI is currency1 in our pool
const TOKEN0 = TOKENS[0]; // mUSDC (6 dec)
const TOKEN1 = TOKENS[1]; // mDAI  (18 dec)

function formatSwapAmount(amount: bigint, decimals: number, symbol: string) {
  const abs = amount < 0n ? -amount : amount;
  const num = parseFloat(formatUnits(abs, decimals));
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals > 6 ? 4 : 2,
  });
  return `${formatted} ${symbol}`;
}

export function SwapHistoryTable() {
  const { swaps, isLoading } = useSwapHistory();

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium text-muted">Time</th>
              <th className="px-4 py-3 font-medium text-muted">Sold</th>
              <th className="px-4 py-3 font-medium text-muted">Received</th>
              <th className="px-4 py-3 font-medium text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-muted">Tx</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  <Loader2 size={18} className="mx-auto animate-spin text-accent" />
                  <p className="mt-2">Loading swap history...</p>
                </td>
              </tr>
            )}
            {!isLoading && swaps.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  No swaps yet. Make your first swap!
                </td>
              </tr>
            )}
            {swaps.map((swap) => {
              // amount0 < 0 means user sent token0, received token1
              const soldToken0 = swap.amount0 < 0n;
              const soldAmount = soldToken0
                ? formatSwapAmount(swap.amount0, TOKEN0.decimals, TOKEN0.symbol)
                : formatSwapAmount(swap.amount1, TOKEN1.decimals, TOKEN1.symbol);
              const receivedAmount = soldToken0
                ? formatSwapAmount(swap.amount1, TOKEN1.decimals, TOKEN1.symbol)
                : formatSwapAmount(swap.amount0, TOKEN0.decimals, TOKEN0.symbol);

              return (
                <tr
                  key={swap.txHash}
                  className="border-b border-border last:border-0 hover:bg-background/50"
                >
                  <td className="px-4 py-3 text-muted">
                    {swap.timestamp ? timeAgo(swap.timestamp) : `Block ${swap.blockNumber.toString()}`}
                  </td>
                  <td className="px-4 py-3 font-medium text-red-400">
                    −{soldAmount}
                  </td>
                  <td className="px-4 py-3 font-medium text-green-400">
                    +{receivedAmount}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Executed</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`${LINKS.blockExplorer}/tx/${swap.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-accent hover:underline"
                    >
                      {shortenAddress(swap.txHash)}
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
