import { db } from "src/db";
import { shipmentEventsTable } from "src/schema";
import { eq, and, isNull, asc, desc } from "drizzle-orm";

export type ShipmentEvent = typeof shipmentEventsTable.$inferSelect;
export type NewShipmentEvent = typeof shipmentEventsTable.$inferInsert;

export type FindShipmentEventResponse =
  | ShipmentEvent
  | "shipment_event_not_found";

export class ShipmentEventRepository {
  async insertShipmentEvent(
    event: NewShipmentEvent,
  ): Promise<ShipmentEvent | null> {
    const [res] = await db
      .insert(shipmentEventsTable)
      .values(event)
      .returning();

    return res ?? null;
  }

  // Bulk insert for couriers that push a full event history on webhook.
  // Use this to hydrate all events in one round trip instead of looping insertShipmentEvent.
  async insertShipmentEvents(
    events: NewShipmentEvent[],
  ): Promise<ShipmentEvent[]> {
    if (events.length === 0) return [];

    return await db.insert(shipmentEventsTable).values(events).returning();
  }

  async findShipmentEventById(id: string): Promise<FindShipmentEventResponse> {
    const [res] = await db
      .select()
      .from(shipmentEventsTable)
      .where(
        and(
          eq(shipmentEventsTable.id, id),
          isNull(shipmentEventsTable.deletedAt),
        ),
      );

    if (!res) return "shipment_event_not_found";

    return res;
  }

  // Returns all events for a shipment ordered chronologically ascending.
  // Use this to render the tracking timeline on the order detail view.
  async findEventsByShipmentId(shipmentId: string): Promise<ShipmentEvent[]> {
    return await db
      .select()
      .from(shipmentEventsTable)
      .where(
        and(
          eq(shipmentEventsTable.shipmentId, shipmentId),
          isNull(shipmentEventsTable.deletedAt),
        ),
      )
      .orderBy(asc(shipmentEventsTable.happenedAt));
  }

  // Returns the most recent event for a shipment.
  // Use this for status badge display without loading the full timeline.
  async findLatestEventByShipmentId(
    shipmentId: string,
  ): Promise<FindShipmentEventResponse> {
    const [res] = await db
      .select()
      .from(shipmentEventsTable)
      .where(
        and(
          eq(shipmentEventsTable.shipmentId, shipmentId),
          isNull(shipmentEventsTable.deletedAt),
        ),
      )
      .orderBy(desc(shipmentEventsTable.happenedAt))
      .limit(1);

    if (!res) return "shipment_event_not_found";

    return res;
  }

  // Soft delete only — shipment events are an immutable audit log of
  // courier activity and must be retained for dispute resolution.
  async softDeleteShipmentEvent(id: string): Promise<boolean> {
    const [res] = await db
      .update(shipmentEventsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(shipmentEventsTable.id, id),
          isNull(shipmentEventsTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Soft deletes the full event history for a shipment in one query.
  // Use this when soft-deleting the parent shipment to cascade consistently.
  async softDeleteEventsByShipmentId(shipmentId: string): Promise<boolean> {
    const res = await db
      .update(shipmentEventsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(shipmentEventsTable.shipmentId, shipmentId),
          isNull(shipmentEventsTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }
}
