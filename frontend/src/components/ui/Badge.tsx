import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const variants: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger:  "bg-danger/10  text-danger",
  info:    "bg-accent/10  text-accent",
  neutral: "bg-muted/20   text-muted",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
