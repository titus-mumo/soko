import { db } from "src/db";
import { deliveryZonesTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

export type DeliveryZone = typeof deliveryZonesTable.$inferSelect;
export type NewDeliveryZone = typeof deliveryZonesTable.$inferInsert;

export type FindDeliveryZoneResponse = DeliveryZone | "delivery_zone_not_found";

export class DeliveryZoneRepository {
  async insertDeliveryZone(
    zone: NewDeliveryZone,
  ): Promise<DeliveryZone | null> {
    const [res] = await db.insert(deliveryZonesTable).values(zone).returning();

    return res ?? null;
  }

  async findDeliveryZoneById(id: string): Promise<FindDeliveryZoneResponse> {
    const [res] = await db
      .select()
      .from(deliveryZonesTable)
      .where(
        and(
          eq(deliveryZonesTable.id, id),
          isNull(deliveryZonesTable.deletedAt),
        ),
      );

    if (!res) return "delivery_zone_not_found";

    return res;
  }

  // Returns all active delivery zones for a county.
  // Use this to resolve the applicable zone and fee when a buyer
  // selects a delivery address at checkout.
  async findZonesByCounty(county: string): Promise<DeliveryZone[]> {
    return await db
      .select()
      .from(deliveryZonesTable)
      .where(
        and(
          eq(deliveryZonesTable.county, county),
          isNull(deliveryZonesTable.deletedAt),
        ),
      );
  }

  // Returns all active delivery zones.
  // Use this for admin zone management and checkout zone listing.
  async findAllDeliveryZones(): Promise<DeliveryZone[]> {
    return await db
      .select()
      .from(deliveryZonesTable)
      .where(isNull(deliveryZonesTable.deletedAt));
  }

  async updateDeliveryZone(
    id: string,
    data: Partial<NewDeliveryZone>,
  ): Promise<FindDeliveryZoneResponse> {
    const [res] = await db
      .update(deliveryZonesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(deliveryZonesTable.id, id),
          isNull(deliveryZonesTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "delivery_zone_not_found";

    return res;
  }

  // Updates the base fee for a zone independently.
  // Use this for periodic fee adjustments without touching other zone fields.
  async updateBaseFee(
    id: string,
    baseFee: string,
  ): Promise<FindDeliveryZoneResponse> {
    const [res] = await db
      .update(deliveryZonesTable)
      .set({ baseFee, updatedAt: new Date() })
      .where(
        and(
          eq(deliveryZonesTable.id, id),
          isNull(deliveryZonesTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "delivery_zone_not_found";

    return res;
  }

  // Updates the estimated delivery days for a zone independently.
  // Use this when logistics SLAs change for a county without affecting fees.
  async updateEstimatedDays(
    id: string,
    estimatedDays: number,
  ): Promise<FindDeliveryZoneResponse> {
    const [res] = await db
      .update(deliveryZonesTable)
      .set({ estimatedDays, updatedAt: new Date() })
      .where(
        and(
          eq(deliveryZonesTable.id, id),
          isNull(deliveryZonesTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "delivery_zone_not_found";

    return res;
  }

  async softDeleteDeliveryZone(id: string): Promise<boolean> {
    const [res] = await db
      .update(deliveryZonesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(deliveryZonesTable.id, id),
          isNull(deliveryZonesTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Permanently removes a delivery zone. Only use when no orders
  // or shipments reference this zone.
  async hardDeleteDeliveryZone(id: string): Promise<boolean> {
    const res = await db
      .delete(deliveryZonesTable)
      .where(eq(deliveryZonesTable.id, id))
      .returning();

    return res.length > 0;
  }
}
