import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  hoverable?: boolean;
}

export function Card({ children, className, header, hoverable }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 text-card-foreground",
        hoverable && "transition-shadow hover:shadow-lg hover:shadow-accent/5",
        className,
      )}
    >
      {header && (
        <div className="mb-3 border-b border-border pb-3 text-sm font-semibold">
          {header}
        </div>
      )}
      {children}
    </div>
  );
}
