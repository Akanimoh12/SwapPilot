"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { TOKENS } from "@/config/tokens";
import type { TokenInfo } from "@/lib/types";

interface TokenSelectorProps {
  onSelect: (token: TokenInfo) => void;
  onClose: () => void;
  exclude?: `0x${string}`;
}

export function TokenSelector({ onSelect, onClose, exclude }: TokenSelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return TOKENS.filter(
      (t) =>
        t.address !== exclude &&
        (t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)),
    );
  }, [search, exclude]);

  return (
    <Modal open onClose={onClose} title="Select Token">
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name or symbol"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
        </div>

        {/* Token list */}
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted">No tokens found</p>
          )}
          {filtered.map((token) => (
            <button
              key={token.address}
              onClick={() => onSelect(token)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                {token.symbol.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium">{token.symbol}</p>
                <p className="text-xs text-muted">{token.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
