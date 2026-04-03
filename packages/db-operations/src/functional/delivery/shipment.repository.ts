import { db } from "src/db";
import { shipmentsTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

export type Shipment = typeof shipmentsTable.$inferSelect;
export type NewShipment = typeof shipmentsTable.$inferInsert;

export type ShipmentStatus =
  | "awaiting_pickup"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export type Courier = "sendy" | "fargo" | "self" | "other";

export type FindShipmentResponse = Shipment | "shipment_not_found";

export class ShipmentRepository {
  async insertShipment(shipment: NewShipment): Promise<Shipment | null> {
    const [res] = await db.insert(shipmentsTable).values(shipment).returning();

    return res ?? null;
  }

  async findShipmentById(id: string): Promise<FindShipmentResponse> {
    const [res] = await db
      .select()
      .from(shipmentsTable)
      .where(and(eq(shipmentsTable.id, id), isNull(shipmentsTable.deletedAt)));

    if (!res) return "shipment_not_found";

    return res;
  }

  // Returns the shipment for a specific order item.
  // Use this to show shipment status on the order detail view.
  async findShipmentByOrderItemId(
    orderItemId: string,
  ): Promise<FindShipmentResponse> {
    const [res] = await db
      .select()
      .from(shipmentsTable)
      .where(
        and(
          eq(shipmentsTable.orderItemId, orderItemId),
          isNull(shipmentsTable.deletedAt),
        ),
      );

    if (!res) return "shipment_not_found";

    return res;
  }

  // Looks up a shipment by tracking number.
  // Use this for tracking page lookups where only the tracking number is known.
  async findShipmentByTrackingNumber(
    trackingNumber: string,
  ): Promise<FindShipmentResponse> {
    const [res] = await db
      .select()
      .from(shipmentsTable)
      .where(
        and(
          eq(shipmentsTable.trackingNumber, trackingNumber),
          isNull(shipmentsTable.deletedAt),
        ),
      );

    if (!res) return "shipment_not_found";

    return res;
  }

  async updateShipment(
    id: string,
    data: Partial<NewShipment>,
  ): Promise<FindShipmentResponse> {
    const [res] = await db
      .update(shipmentsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shipmentsTable.id, id), isNull(shipmentsTable.deletedAt)))
      .returning();

    if (!res) return "shipment_not_found";

    return res;
  }

  // Advances the shipment status and stamps shippedAt when the
  // shipment first transitions to in_transit.
  async updateShipmentStatus(
    id: string,
    status: ShipmentStatus,
  ): Promise<FindShipmentResponse> {
    const now = new Date();

    const [res] = await db
      .update(shipmentsTable)
      .set({
        status,
        updatedAt: now,
        ...(status === "in_transit" && { shippedAt: now }),
        ...(status === "delivered" && { deliveredAt: now }),
      })
      .where(and(eq(shipmentsTable.id, id), isNull(shipmentsTable.deletedAt)))
      .returning();

    if (!res) return "shipment_not_found";

    return res;
  }

  // Attaches a tracking number and courier to a shipment.
  // Use this when the seller books a courier and receives a tracking reference.
  async assignTracking(
    id: string,
    courier: Courier,
    trackingNumber: string,
  ): Promise<FindShipmentResponse> {
    const [res] = await db
      .update(shipmentsTable)
      .set({ courier, trackingNumber, updatedAt: new Date() })
      .where(and(eq(shipmentsTable.id, id), isNull(shipmentsTable.deletedAt)))
      .returning();

    if (!res) return "shipment_not_found";

    return res;
  }

  // Soft delete only — shipments are part of the fulfilment audit trail
  // and must be retained alongside their parent order items.
  async softDeleteShipment(id: string): Promise<boolean> {
    const [res] = await db
      .update(shipmentsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(shipmentsTable.id, id), isNull(shipmentsTable.deletedAt)))
      .returning();

    return !!res;
  }
}
