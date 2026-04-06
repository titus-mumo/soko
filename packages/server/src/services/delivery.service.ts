import { getRepositories } from "../lib/repositories";
import type { NewDeliveryZone, NewShipment } from "db-operations";

const {
  deliveryZoneRepository,
  shipmentRepository,
  shipmentEventRepository,
  orderItemRepository,
  orderRepository,
  notificationRepository,
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

export async function getShipmentByOrderItemId(orderItemId: string) {
  const shipment =
    await shipmentRepository.findShipmentByOrderItemId(orderItemId);
  if (shipment === "shipment_not_found") return "shipment_not_found" as const;
  return shipment;
}

export async function getShipmentByTrackingNumber(trackingNumber: string) {
  const shipment =
    await shipmentRepository.findShipmentByTrackingNumber(trackingNumber);
  if (shipment === "shipment_not_found") return "shipment_not_found" as const;
  return shipment;
}

// Creates a shipment for an order item.
// Call this after the seller confirms the order item.
export async function createShipment(
  sellerId: string,
  orderItemId: string,
  data: Pick<NewShipment, "courier">,
): Promise<
  | "order_item_not_found"
  | "shipment_already_exists"
  | Awaited<ReturnType<typeof shipmentRepository.insertShipment>>
> {
  // Confirm the order item belongs to this seller.
  const orderItem = await orderItemRepository.findOrderItemById(orderItemId);
  if (orderItem === "order_item_not_found") return "order_item_not_found";
  if ((orderItem as any).sellerId !== sellerId) return "order_item_not_found";

  // Prevent duplicate shipments for the same order item.
  const existing =
    await shipmentRepository.findShipmentByOrderItemId(orderItemId);
  if (existing !== "shipment_not_found") return "shipment_already_exists";

  const shipment = await shipmentRepository.insertShipment({
    orderItemId,
    courier: data.courier,
    status: "awaiting_pickup",
  });

  // Log the initial shipment event.
  if (shipment) {
    await shipmentEventRepository.insertShipmentEvent({
      shipmentId: shipment.id,
      status: "awaiting_pickup",
      description: "Shipment created and awaiting pickup.",
    });
  }

  return shipment;
}

export async function assignTrackingNumber(
  shipmentId: string,
  courier: "sendy" | "fargo" | "self" | "other",
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

// Advances the shipment status and logs the event.
// Also updates the parent order item status to keep them in sync.
export async function updateShipmentStatus(
  shipmentId: string,
  status:
    | "awaiting_pickup"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed"
    | "returned",
  meta?: { description?: string; location?: string },
): Promise<"shipment_not_found" | "status_updated"> {
  const shipment = await shipmentRepository.updateShipmentStatus(
    shipmentId,
    status,
  );

  if (shipment === "shipment_not_found") return "shipment_not_found";

  // Log the status change as a shipment event.
  await shipmentEventRepository.insertShipmentEvent({
    shipmentId,
    status,
    description: meta?.description ?? `Shipment status updated to ${status}.`,
    location: meta?.location,
  });

  // Map shipment status to order item status to keep them in sync.
  const orderItemStatusMap: Record<
    string,
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
  > = {
    awaiting_pickup: "confirmed",
    in_transit: "shipped",
    out_for_delivery: "shipped",
    delivered: "delivered",
    failed: "processing",
    returned: "cancelled",
  };

  const orderItemStatus = orderItemStatusMap[status];

  if (orderItemStatus) {
    await orderItemRepository.updateOrderItemStatus(
      shipment.orderItemId,
      (shipment as any).sellerId,
      orderItemStatus,
    );
  }

  // Notify the buyer of shipment status changes that affect them.
  const notifyStatuses = [
    "in_transit",
    "out_for_delivery",
    "delivered",
    "failed",
    "returned",
  ];

  if (notifyStatuses.includes(status)) {
    const orderItem = await orderItemRepository.findOrderItemById(
      shipment.orderItemId,
    );

    if (orderItem !== "order_item_not_found") {
      const order = await orderRepository.findOrderById(
        (orderItem as any).orderId,
      );

      if (order !== "order_not_found") {
        const statusMessages: Record<string, string> = {
          in_transit: "Your order is on its way!",
          out_for_delivery: "Your order is out for delivery today.",
          delivered: "Your order has been delivered. Enjoy!",
          failed: "Delivery of your order failed. We will retry soon.",
          returned: "Your order has been returned.",
        };

        await notificationRepository.insertNotification({
          userId: order.buyerId,
          type: "shipment_update",
          title: "Shipment Update",
          body:
            statusMessages[status] ?? `Your shipment status is now ${status}.`,
          channel: "push",
        });
      }
    }
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
    status:
      | "awaiting_pickup"
      | "in_transit"
      | "out_for_delivery"
      | "delivered"
      | "failed"
      | "returned";
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
