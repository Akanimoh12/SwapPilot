import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type DisplayStatus = "queued" | "monitoring" | "executed" | "expired";

const statusConfig: Record<
  DisplayStatus,
  { variant: "warning" | "info" | "success" | "danger"; label: string; pulse?: boolean }
> = {
  queued:     { variant: "warning", label: "Queued" },
  monitoring: { variant: "info",    label: "Monitoring", pulse: true },
  executed:   { variant: "success", label: "Executed" },
  expired:    { variant: "danger",  label: "Expired" },
};

interface OrderStatusBadgeProps {
  status: DisplayStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const { variant, label, pulse } = statusConfig[status];

  return (
    <Badge
      variant={variant}
      dot
      className={cn(pulse && "animate-pulse", className)}
    >
      {label}
    </Badge>
  );
}
