import { db } from "src/db";
import { pageNewestFirst, type Page, type PageParams } from "../../pagination";
import { promotionsTable } from "src/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export type Promotion = typeof promotionsTable.$inferSelect;
export type NewPromotion = typeof promotionsTable.$inferInsert;

export type PromotionType = "percent" | "fixed";

export type FindPromotionResponse = Promotion | "promotion_not_found";

export class PromotionRepository {
  // Paged, newest first: a seller's promotions, or platform-wide ones.
  async pagePromotions(
    sellerId: string | null,
    params?: PageParams,
  ): Promise<Page<Promotion>> {
    return pageNewestFirst<Promotion>(
      promotionsTable,
      and(
        sellerId
          ? eq(promotionsTable.sellerId, sellerId)
          : isNull(promotionsTable.sellerId),
        isNull(promotionsTable.deletedAt),
      ),
      params,
    );
  }

  async insertPromotion(promotion: NewPromotion): Promise<Promotion | null> {
    const [res] = await db
      .insert(promotionsTable)
      .values(promotion)
      .returning();

    return res ?? null;
  }

  async findPromotionById(id: string): Promise<FindPromotionResponse> {
    const [res] = await db
      .select()
      .from(promotionsTable)
      .where(
        and(eq(promotionsTable.id, id), isNull(promotionsTable.deletedAt)),
      );

    if (!res) return "promotion_not_found";

    return res;
  }

  // Looks up a promotion by its code for redemption at checkout.
  // Validity checks (expiry, uses, active state) must be done at the service layer.
  async findPromotionByCode(code: string): Promise<FindPromotionResponse> {
    const [res] = await db
      .select()
      .from(promotionsTable)
      .where(
        and(eq(promotionsTable.code, code), isNull(promotionsTable.deletedAt)),
      );

    if (!res) return "promotion_not_found";

    return res;
  }

  // Returns all promotions belonging to a seller.
  // Use this for the seller's promotions management dashboard.
  async findPromotionsBySellerId(sellerId: string): Promise<Promotion[]> {
    return await db
      .select()
      .from(promotionsTable)
      .where(
        and(
          eq(promotionsTable.sellerId, sellerId),
          isNull(promotionsTable.deletedAt),
        ),
      );
  }

  // Returns platform-wide promotions (sellerId is null).
  // Use this for admin-managed promotions that apply across all sellers.
  async findPlatformPromotions(): Promise<Promotion[]> {
    return await db
      .select()
      .from(promotionsTable)
      .where(
        and(
          isNull(promotionsTable.sellerId),
          isNull(promotionsTable.deletedAt),
        ),
      );
  }

  async updatePromotion(
    id: string,
    data: Partial<NewPromotion>,
  ): Promise<FindPromotionResponse> {
    const [res] = await db
      .update(promotionsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(promotionsTable.id, id), isNull(promotionsTable.deletedAt)))
      .returning();

    if (!res) return "promotion_not_found";

    return res;
  }

  async activatePromotion(id: string): Promise<FindPromotionResponse> {
    const [res] = await db
      .update(promotionsTable)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(promotionsTable.id, id), isNull(promotionsTable.deletedAt)))
      .returning();

    if (!res) return "promotion_not_found";

    return res;
  }

  async deactivatePromotion(id: string): Promise<FindPromotionResponse> {
    const [res] = await db
      .update(promotionsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(promotionsTable.id, id), isNull(promotionsTable.deletedAt)))
      .returning();

    if (!res) return "promotion_not_found";

    return res;
  }

  // Atomically increments usesCount by 1 on redemption.
  // Always call this inside the same transaction as the order creation
  // to prevent over-redemption under concurrent requests.
  async incrementUsesCount(id: string): Promise<FindPromotionResponse> {
    const [res] = await db
      .update(promotionsTable)
      .set({
        usesCount: sql`${promotionsTable.usesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(promotionsTable.id, id), isNull(promotionsTable.deletedAt)))
      .returning();

    if (!res) return "promotion_not_found";

    return res;
  }

  // Soft delete only — promotions are referenced by orders and
  // must be retained for historical discount auditing.
  async softDeletePromotion(id: string): Promise<boolean> {
    const [res] = await db
      .update(promotionsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(and(eq(promotionsTable.id, id), isNull(promotionsTable.deletedAt)))
      .returning();

    return !!res;
  }
}
