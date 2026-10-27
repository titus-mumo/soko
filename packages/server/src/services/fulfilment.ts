// Fulfilment through the Soko hub.
//
// Sellers prepare their items and drop them off at the hub. Once every item
// still in an order is at the hub, Soko ships the order to the buyer as one
// shipment. The buyer follows the order, not individual items, so the
// order's status is derived here from its items and shipment — never set
// piecemeal by sellers.

import { getRepositories } from "../lib/repositories";
import type { OrderItem, OrderStatus, Shipment } from "db-operations";

const {
  orderRepository,
  orderItemRepository,
  shipmentRepository,
  notificationRepository,
} = getRepositories();

/** Items no longer part of the delivery. */
export const INACTIVE: OrderStatus[] = ["cancelled", "refunded"];

export const isActive = (item: Pick<OrderItem, "status">) =>
  !INACTIVE.includes(item.status);

/** The order status implied by its items and shipment. */
export function deriveOrderStatus(
  current: OrderStatus,
  items: Pick<OrderItem, "status">[],
  shipment: Pick<Shipment, "status"> | null,
): OrderStatus {
  const active = items.filter(isActive);
  if (items.length > 0 && active.length === 0) return "cancelled";
  // Admin-set terminal states stand.
  if (current === "refunded" || current === "cancelled") return current;

  if (shipment) {
    switch (shipment.status) {
      case "delivered":
        return "delivered";
      case "in_transit":
      case "out_for_delivery":
      case "failed":
        return "shipped";
      case "awaiting_pickup":
        return "processing";
      case "returned":
        return current;
    }
  }

  // Unpaid orders stay pending until payment confirms them.
  if (current === "pending") return "pending";
  if (
    active.some((i) =>
      ["processing", "dropped_off", "at_hub"].includes(i.status),
    )
  )
    return "processing";
  return "confirmed";
}

/** Recomputes and stores the order's status. Returns the before/after. */
export async function syncOrderStatus(orderId: string) {
  const order = await orderRepository.findOrderById(orderId);
  if (order === "order_not_found") return null;
  const items = await orderItemRepository.findItemsByOrderId(orderId);
  const shipment = await shipmentRepository.findShipmentByOrderId(orderId);
  const next = deriveOrderStatus(
    order.status,
    items,
    shipment === "shipment_not_found" ? null : shipment,
  );
  if (next !== order.status)
    await orderRepository.updateOrderStatus(orderId, next);
  return { order, previous: order.status, next, items };
}

/** Short reference shown to people — the same one the web app shows. */
export const orderRef = (orderId: string) =>
  `#${orderId.slice(-8).toUpperCase()}`;

export async function notifyBuyer(
  buyerId: string,
  type: string,
  title: string,
  body: string,
) {
  await notificationRepository.insertNotification({
    userId: buyerId,
    type,
    title,
    body,
    channel: "push",
  });
}
