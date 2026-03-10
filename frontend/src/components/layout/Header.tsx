"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectButton } from "@/components/wallet/ConnectButton";

const NAV_ITEMS = [
  { href: "/swap", label: "Swap" },
  { href: "/queue", label: "Queue" },
  { href: "/history", label: "History" },
  { href: "/analytics", label: "Analytics" },
] as const;

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <Zap className="h-4 w-4 text-accent" />
          </div>
          SwapPilot
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-background hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ConnectButton />

          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-2 text-muted hover:text-foreground md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="border-t border-border bg-card px-4 py-3 md:hidden">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-background hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
