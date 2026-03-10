"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_ITEMS = [
  { href: "/swap", label: "Swap", icon: ArrowRightLeft },
  { href: "/queue", label: "Queue", icon: ListOrdered },
  { href: "/history", label: "History", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden flex-shrink-0 border-r border-border bg-card transition-all lg:flex lg:flex-col",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-background hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center border-t border-border p-3 text-muted hover:text-foreground"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
