"use client";

import { useState, useMemo } from "react";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, shortenAddress, timeAgo, formatEther, formatBps } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { LINKS } from "@/lib/constants";
import type { ExecutionResult } from "@/lib/types";

interface ExecutionHistoryProps {
  data?: ExecutionResult[];
  pageSize?: number;
  className?: string;
}

const COLUMNS = ["Time", "Order", "Trader", "Amount", "Wait", "AI Score", "Slippage", "Status"] as const;

type SortKey = "aiScore" | "actualSlippage" | "waitTimeSeconds" | "blockNumber";

export function ExecutionHistory({
  data = [],
  pageSize = 10,
  className,
}: ExecutionHistoryProps) {
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("blockNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const clone = [...data];
    clone.sort((a, b) => {
      const av = Number(a[sortBy as keyof ExecutionResult]);
      const bv = Number(b[sortBy as keyof ExecutionResult]);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return clone;
  }, [data, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((col) => (
                <th key={col} className="px-4 py-3 font-medium text-muted">
                  {col}
                </th>
              ))}
              <th className="px-4 py-3 font-medium text-muted">Tx</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted">
                  No execution history yet
                </td>
              </tr>
            )}
            {paged.map((row) => (
              <tr
                key={row.txHash}
                className="border-b border-border last:border-0 hover:bg-background/50"
              >
                <td className="px-4 py-3 text-muted">
                  {timeAgo(row.blockNumber)}
                </td>
                <td className="px-4 py-3 font-medium">
                  #{row.orderId.toString()}
                </td>
                <td className="px-4 py-3 font-mono text-muted">
                  {shortenAddress(row.trader)}
                </td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3">{row.waitTimeSeconds}s</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={row.aiScore >= 70 ? "success" : row.aiScore >= 40 ? "warning" : "danger"}
                    dot
                  >
                    {row.aiScore}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-success">
                  {formatBps(row.actualSlippage)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="success">Executed</Badge>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`${LINKS.blockExplorer}/tx/${row.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    <ExternalLink size={12} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-xs text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-1.5 text-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg p-1.5 text-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
