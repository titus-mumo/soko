import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

// pending=amber, confirmed=blue, delivered=green, cancelled=red, refunded=zinc, shipped=blue

const orderColors: Record<OrderStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  confirmed:
    "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  shipped:
    "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900",
  delivered:
    "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
  cancelled:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  refunded:
    "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

const paymentColors: Record<PaymentStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  paid: "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
  failed:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  refunded:
    "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

const orderLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        orderColors[status],
        className,
      )}
    >
      {orderLabels[status]}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        paymentColors[status],
        className,
      )}
    >
      {paymentLabels[status]}
    </span>
  );
}
