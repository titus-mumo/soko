import { getRepositories } from "../lib/repositories";
import type {
  Courier,
  NewDeliveryZone,
  Shipment,
  ShipmentStatus,
} from "db-operations";
import { HUB_LABEL } from "../lib/hub";
import { isActive, notifyBuyer, orderRef, syncOrderStatus } from "./fulfilment";

const {
  deliveryZoneRepository,
  shipmentRepository,
  shipmentEventRepository,
  orderItemRepository,
  orderRepository,
} = getRepositories();

// ─────────────────────────────────────────
// Delivery Zones
// ─────────────────────────────────────────

export async function getAllDeliveryZones() {
  return await deliveryZoneRepository.findAllDeliveryZones();
}

export async function getDeliveryZonesByCounty(county: string) {
  const zones = await deliveryZoneRepository.findZonesByCounty(county);

  if (zones.length === 0) return "no_zones_found" as const;

  return zones;
}

export async function createDeliveryZone(
  data: Pick<NewDeliveryZone, "name" | "county" | "estimatedDays" | "baseFee">,
) {
  return await deliveryZoneRepository.insertDeliveryZone(data);
}

export async function updateDeliveryZone(
  id: string,
  data: Partial<
    Pick<NewDeliveryZone, "name" | "county" | "estimatedDays" | "baseFee">
  >,
) {
  return await deliveryZoneRepository.updateDeliveryZone(id, data);
}

export async function updateDeliveryZoneFee(
  id: string,
  baseFee: string,
): Promise<"delivery_zone_not_found" | "fee_updated"> {
  const result = await deliveryZoneRepository.updateBaseFee(id, baseFee);
  if (result === "delivery_zone_not_found") return "delivery_zone_not_found";
  return "fee_updated";
}

export async function updateDeliveryZoneEstimatedDays(
  id: string,
  estimatedDays: number,
): Promise<"delivery_zone_not_found" | "days_updated"> {
  const result = await deliveryZoneRepository.updateEstimatedDays(
    id,
    estimatedDays,
  );
  if (result === "delivery_zone_not_found") return "delivery_zone_not_found";
  return "days_updated";
}

export async function deleteDeliveryZone(
  id: string,
): Promise<"delivery_zone_not_found" | "zone_deleted"> {
  const result = await deliveryZoneRepository.softDeleteDeliveryZone(id);
  if (!result) return "delivery_zone_not_found";
  return "zone_deleted";
}

// ─────────────────────────────────────────
// Shipments
// ─────────────────────────────────────────

/**
 * The buyer's view of their order's shipment and timeline. Null when the
 * order isn't theirs or hasn't shipped from the hub yet.
 */
export async function getBuyerOrderShipment(userId: string, orderId: string) {
  const order = await orderRepository.findOrderByIdAndBuyerId(orderId, userId);
  if (order === "order_not_found") return "order_not_found" as const;
  const shipment = await shipmentRepository.findShipmentByOrderId(orderId);
  if (shipment === "shipment_not_found") return null;
  const timeline = await getShipmentTimeline(shipment.id);
  return timeline === "shipment_not_found" ? null : timeline;
}

export async function getShipmentByTrackingNumber(trackingNumber: string) {
  const shipment =
    await shipmentRepository.findShipmentByTrackingNumber(trackingNumber);
  if (shipment === "shipment_not_found") return "shipment_not_found" as const;
  return shipment;
}

/**
 * The hub sends an order: one shipment for everything still in it. Only
 * once every remaining item has been received at the hub.
 */
export async function createOrderShipment(
  orderId: string,
  data: { courier: Courier; trackingNumber?: string },
): Promise<
  | "order_not_found"
  | "order_not_paid"
  | "shipment_already_exists"
  | "items_not_at_hub"
  | Shipment
> {
  const order = await orderRepository.findOrderById(orderId);
  if (order === "order_not_found") return "order_not_found";
  if (order.paymentStatus !== "paid") return "order_not_paid";

  const existing = await shipmentRepository.findShipmentByOrderId(orderId);
  if (existing !== "shipment_not_found") return "shipment_already_exists";

  const items = (await orderItemRepository.findItemsByOrderId(orderId)).filter(
    isActive,
  );
  if (items.length === 0 || items.some((i) => i.status !== "at_hub"))
    return "items_not_at_hub";

  const shipment = await shipmentRepository.insertShipment({
    orderId,
    courier: data.courier,
    trackingNumber: data.trackingNumber,
    status: "awaiting_pickup",
  });
  if (!shipment) throw new Error("Failed to create shipment");

  await shipmentEventRepository.insertShipmentEvent({
    shipmentId: shipment.id,
    status: "awaiting_pickup",
    description: "Packed at the hub and waiting for the courier.",
    location: HUB_LABEL,
  });
  await syncOrderStatus(orderId);

  return shipment;
}

export async function assignTrackingNumber(
  shipmentId: string,
  courier: Courier,
  trackingNumber: string,
): Promise<"shipment_not_found" | "tracking_assigned"> {
  const result = await shipmentRepository.assignTracking(
    shipmentId,
    courier,
    trackingNumber,
  );

  if (result === "shipment_not_found") return "shipment_not_found";

  return "tracking_assigned";
}

// What the buyer is told at each shipment step. Steps not listed are quiet.
const BUYER_MESSAGES: Partial<
  Record<ShipmentStatus, [title: string, body: (ref: string) => string]>
> = {
  in_transit: [
    "Your order has shipped",
    (ref) => `Order ${ref} has left the Soko hub and is on its way.`,
  ],
  out_for_delivery: [
    "Out for delivery",
    (ref) => `Order ${ref} is out for delivery today.`,
  ],
  delivered: ["Delivered", (ref) => `Order ${ref} has been delivered. Enjoy!`],
  failed: [
    "Delivery attempt failed",
    (ref) => `We couldn't deliver order ${ref}. We'll try again soon.`,
  ],
  returned: [
    "Order returned",
    (ref) => `Order ${ref} was returned to the Soko hub. We'll be in touch.`,
  ],
};

/**
 * Advances the order's shipment, logs the event, moves the items along
 * (shipped / delivered), re-derives the order status and tells the buyer —
 * once per step, for the whole order.
 */
export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
  meta?: { description?: string; location?: string },
): Promise<"shipment_not_found" | "status_updated"> {
  const shipment = await shipmentRepository.updateShipmentStatus(
    shipmentId,
    status,
  );
  if (shipment === "shipment_not_found") return "shipment_not_found";

  await shipmentEventRepository.insertShipmentEvent({
    shipmentId,
    status,
    description:
      meta?.description ??
      BUYER_MESSAGES[status]?.[0] ??
      `Shipment ${status.replace(/_/g, " ")}.`,
    location: meta?.location,
  });

  if (status === "in_transit" || status === "out_for_delivery") {
    await orderItemRepository.updateStatusByOrderIdWhere(
      shipment.orderId,
      ["at_hub"],
      "shipped",
    );
  } else if (status === "delivered") {
    await orderItemRepository.updateStatusByOrderIdWhere(
      shipment.orderId,
      ["at_hub", "shipped"],
      "delivered",
    );
  }

  const synced = await syncOrderStatus(shipment.orderId);
  const message = BUYER_MESSAGES[status];
  if (synced && message) {
    await notifyBuyer(
      synced.order.buyerId,
      "shipment_update",
      message[0],
      message[1](orderRef(shipment.orderId)),
    );
  }

  return "status_updated";
}

// ─────────────────────────────────────────
// Shipment Events (Tracking Timeline)
// ─────────────────────────────────────────

// Returns the full tracking timeline for a shipment.
// Use this to render the tracking page on the buyer's order detail view.
export async function getShipmentTimeline(shipmentId: string) {
  const shipment = await shipmentRepository.findShipmentById(shipmentId);
  if (shipment === "shipment_not_found") return "shipment_not_found" as const;

  const events =
    await shipmentEventRepository.findEventsByShipmentId(shipmentId);
  const latestEvent =
    await shipmentEventRepository.findLatestEventByShipmentId(shipmentId);

  return {
    shipment,
    events,
    latestEvent:
      latestEvent === "shipment_event_not_found" ? null : latestEvent,
  };
}

// Bulk inserts events from a courier webhook.
// Use this when a courier pushes a full history on first contact.
export async function bulkInsertShipmentEvents(
  shipmentId: string,
  events: Array<{
    status: ShipmentStatus;
    description?: string;
    location?: string;
    happenedAt?: Date;
  }>,
) {
  const shipment = await shipmentRepository.findShipmentById(shipmentId);
  if (shipment === "shipment_not_found") return "shipment_not_found" as const;

  return await shipmentEventRepository.insertShipmentEvents(
    events.map((event) => ({
      shipmentId,
      status: event.status,
      description: event.description,
      location: event.location,
      happenedAt: event.happenedAt ?? new Date(),
    })),
  );
}
