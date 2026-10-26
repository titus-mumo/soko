// Fulfilment through the Soko hub.
//
// Sellers prepare their items and drop them off at the hub. Once every item
// still in an order is at the hub, Soko ships the order to the buyer as one
// shipment. The buyer follows the order, not individual items, so the
// order's status is derived here from its items and shipment — never set
// piecemeal by sellers.

import { getRepositories } from "../lib/repositories";
import { DROP_OFF_HOURS, HUB_LABEL } from "../lib/hub";
import type { OrderItem, OrderStatus, Shipment } from "db-operations";

const {
  orderRepository,
  orderItemRepository,
  shipmentRepository,
  sellerProfileRepository,
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

/**
 * Tells each seller in a newly paid order what to drop off at the hub.
 * One notification per seller, however many of their items are in it.
 */
export async function notifySellersOfPaidOrder(orderId: string) {
  const items = (await orderItemRepository.findItemsByOrderId(orderId)).filter(
    isActive,
  );
  const bySeller = new Map<string, number>();
  for (const i of items)
    bySeller.set(i.sellerId, (bySeller.get(i.sellerId) ?? 0) + i.quantity);

  await Promise.all(
    [...bySeller].map(async ([sellerId, units]) => {
      const seller =
        await sellerProfileRepository.findSellerProfileById(sellerId);
      if (seller === "seller_not_found") return;
      await notificationRepository.insertNotification({
        userId: seller.userId,
        type: "seller_new_order",
        title: "New order to prepare",
        body: `Order ${orderRef(orderId)}: ${units} item${units === 1 ? "" : "s"} paid. Drop off at ${HUB_LABEL} within ${DROP_OFF_HOURS} hours.`,
        channel: "push",
      });
    }),
  );
}
