import { Badge, type BadgeTone } from "./Badge";
import type {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  ShipmentStatus,
} from "@/lib/types";

// pending=amber, confirmed=blue, processing/hub steps=indigo, shipped=purple,
// delivered=green, cancelled=red, refunded=zinc
const ORDER: Record<OrderStatus, BadgeTone> = {
  pending: "warning",
  confirmed: "info",
  processing: "indigo",
  dropped_off: "indigo",
  at_hub: "indigo",
  shipped: "purple",
  delivered: "success",
  cancelled: "error",
  refunded: "neutral",
};

// What buyers read: the order as a whole, with hub steps folded into
// "Preparing".
const ORDER_LABELS: Partial<Record<OrderStatus, string>> = {
  processing: "Preparing",
  dropped_off: "Preparing",
  at_hub: "Preparing",
};

// What sellers and hub staff read for a single item.
const ITEM_LABELS: Partial<Record<OrderStatus, string>> = {
  pending: "Awaiting payment",
  confirmed: "To prepare",
  processing: "Packing",
  dropped_off: "Dropped off",
  at_hub: "At hub",
};

const PAYMENT: Record<PaymentStatus, BadgeTone> = {
  pending: "warning",
  paid: "success",
  failed: "error",
  refunded: "neutral",
};

const SHIPMENT: Record<ShipmentStatus, BadgeTone> = {
  awaiting_pickup: "warning",
  in_transit: "purple",
  out_for_delivery: "indigo",
  delivered: "success",
  failed: "error",
  returned: "neutral",
};

const PRODUCT: Record<ProductStatus, BadgeTone> = {
  draft: "neutral",
  active: "success",
  suspended: "error",
  out_of_stock: "warning",
};

/** "out_for_delivery" → "Out for delivery" */
export function statusLabel(status: string): string {
  const text = status.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface StatusBadgeProps<T> {
  status: T;
  className?: string;
  size?: "sm" | "md";
}

function make<T extends string>(
  map: Record<T, BadgeTone>,
  labels: Partial<Record<T, string>> = {},
) {
  return function StatusPill({ status, className, size }: StatusBadgeProps<T>) {
    return (
      <Badge
        tone={map[status] ?? "neutral"}
        dot
        size={size}
        className={className}
      >
        {labels[status] ?? statusLabel(status)}
      </Badge>
    );
  };
}

/** An order's status, as the buyer sees it. */
export const OrderStatusBadge = make(ORDER, ORDER_LABELS);
/** One item's fulfilment step, as the seller / hub sees it. */
export const ItemStatusBadge = make(ORDER, ITEM_LABELS);
export const itemStatusLabel = (s: OrderStatus) =>
  ITEM_LABELS[s] ?? statusLabel(s);
export const PaymentStatusBadge = make(PAYMENT);
export const ShipmentStatusBadge = make(SHIPMENT);
export const ProductStatusBadge = make(PRODUCT);
