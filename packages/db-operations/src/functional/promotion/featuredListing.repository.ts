import { db } from "src/db";
import { featuredListingsTable } from "src/schema";
import { eq, and, isNull, lte, gte } from "drizzle-orm";

export type FeaturedListing = typeof featuredListingsTable.$inferSelect;
export type NewFeaturedListing = typeof featuredListingsTable.$inferInsert;

export type Placement = "homepage" | "category" | "search";

export type FindFeaturedListingResponse =
  | FeaturedListing
  | "featured_listing_not_found";

export class FeaturedListingRepository {
  async insertFeaturedListing(
    listing: NewFeaturedListing,
  ): Promise<FeaturedListing | null> {
    const [res] = await db
      .insert(featuredListingsTable)
      .values(listing)
      .returning();

    return res ?? null;
  }

  async findFeaturedListingById(
    id: string,
  ): Promise<FindFeaturedListingResponse> {
    const [res] = await db
      .select()
      .from(featuredListingsTable)
      .where(
        and(
          eq(featuredListingsTable.id, id),
          isNull(featuredListingsTable.deletedAt),
        ),
      );

    if (!res) return "featured_listing_not_found";

    return res;
  }

  // Returns all listings for a seller regardless of active state or schedule.
  // Use this for the seller's promoted listings management page.
  async findListingsBySellerId(sellerId: string): Promise<FeaturedListing[]> {
    return await db
      .select()
      .from(featuredListingsTable)
      .where(
        and(
          eq(featuredListingsTable.sellerId, sellerId),
          isNull(featuredListingsTable.deletedAt),
        ),
      );
  }

  // Returns all listings for a product across all placements.
  // Use this to check if a product is already being featured before inserting.
  async findListingsByProductId(productId: string): Promise<FeaturedListing[]> {
    return await db
      .select()
      .from(featuredListingsTable)
      .where(
        and(
          eq(featuredListingsTable.productId, productId),
          isNull(featuredListingsTable.deletedAt),
        ),
      );
  }

  // Returns currently live listings for a placement — active, not deleted,
  // and within their scheduled window. Use this to populate featured slots
  // on the homepage, category pages, or search results.
  async findActiveLisingsByPlacement(
    placement: Placement,
  ): Promise<FeaturedListing[]> {
    const now = new Date();

    return await db
      .select()
      .from(featuredListingsTable)
      .where(
        and(
          eq(featuredListingsTable.placement, placement),
          eq(featuredListingsTable.isActive, true),
          lte(featuredListingsTable.startsAt, now),
          gte(featuredListingsTable.endsAt, now),
          isNull(featuredListingsTable.deletedAt),
        ),
      );
  }

  async updateFeaturedListing(
    id: string,
    sellerId: string,
    data: Partial<NewFeaturedListing>,
  ): Promise<FindFeaturedListingResponse> {
    // sellerId is scoped in the where clause to prevent a seller from
    // modifying another seller's featured listing by guessing a UUID.
    const [res] = await db
      .update(featuredListingsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(featuredListingsTable.id, id),
          eq(featuredListingsTable.sellerId, sellerId),
          isNull(featuredListingsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "featured_listing_not_found";

    return res;
  }

  async activateListing(id: string): Promise<FindFeaturedListingResponse> {
    const [res] = await db
      .update(featuredListingsTable)
      .set({ isActive: true, updatedAt: new Date() })
      .where(
        and(
          eq(featuredListingsTable.id, id),
          isNull(featuredListingsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "featured_listing_not_found";

    return res;
  }

  // Deactivates a listing without deleting it.
  // Use this to pause a promotion mid-schedule without losing the record.
  async deactivateListing(id: string): Promise<FindFeaturedListingResponse> {
    const [res] = await db
      .update(featuredListingsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(featuredListingsTable.id, id),
          isNull(featuredListingsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "featured_listing_not_found";

    return res;
  }

  // Soft delete only — featured listings are tied to payments and must
  // be retained for billing reconciliation and seller spend history.
  async softDeleteFeaturedListing(
    id: string,
    sellerId: string,
  ): Promise<boolean> {
    const [res] = await db
      .update(featuredListingsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(
        and(
          eq(featuredListingsTable.id, id),
          eq(featuredListingsTable.sellerId, sellerId),
          isNull(featuredListingsTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }
}
