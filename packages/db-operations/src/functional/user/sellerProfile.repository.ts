import { db } from "src/db";
import { sellerProfilesTable } from "src/schema";
import { eq, isNull } from "drizzle-orm";

export type SellerProfile = typeof sellerProfilesTable.$inferSelect;
export type NewSellerProfile = typeof sellerProfilesTable.$inferInsert;

export type FindSellerProfileResponse = SellerProfile | "seller_not_found";

export class SellerProfileRepository {
  async insertSellerProfile(
    profile: NewSellerProfile,
  ): Promise<SellerProfile | null> {
    const [res] = await db
      .insert(sellerProfilesTable)
      .values(profile)
      .returning();

    return res ?? null;
  }

  async findSellerProfileById(id: string): Promise<FindSellerProfileResponse> {
    const [res] = await db
      .select()
      .from(sellerProfilesTable)
      .where(eq(sellerProfilesTable.id, id));

    if (!res) return "seller_not_found";

    return res;
  }

  async findSellerProfileByUserId(
    userId: string,
  ): Promise<FindSellerProfileResponse> {
    const [res] = await db
      .select()
      .from(sellerProfilesTable)
      .where(eq(sellerProfilesTable.userId, userId));

    if (!res) return "seller_not_found";

    return res;
  }

  async findSellerProfileBySlug(
    slug: string,
  ): Promise<FindSellerProfileResponse> {
    const [res] = await db
      .select()
      .from(sellerProfilesTable)
      .where(eq(sellerProfilesTable.storeSlug, slug));

    if (!res) return "seller_not_found";

    return res;
  }

  async updateSellerProfile(
    userId: string,
    data: Partial<NewSellerProfile>,
  ): Promise<FindSellerProfileResponse> {
    const [res] = await db
      .update(sellerProfilesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sellerProfilesTable.userId, userId))
      .returning();

    if (!res) return "seller_not_found";

    return res;
  }

  async verifySeller(userId: string): Promise<FindSellerProfileResponse> {
    const [res] = await db
      .update(sellerProfilesTable)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(sellerProfilesTable.userId, userId))
      .returning();

    if (!res) return "seller_not_found";

    return res;
  }

  async updateRating(
    userId: string,
    rating: string,
  ): Promise<FindSellerProfileResponse> {
    const [res] = await db
      .update(sellerProfilesTable)
      .set({ rating, updatedAt: new Date() })
      .where(eq(sellerProfilesTable.userId, userId))
      .returning();

    if (!res) return "seller_not_found";

    return res;
  }

  async incrementTotalSales(
    userId: string,
    by: number = 1,
  ): Promise<FindSellerProfileResponse> {
    const current = await this.findSellerProfileByUserId(userId);
    if (typeof current === "string") return current;

    const [res] = await db
      .update(sellerProfilesTable)
      .set({
        totalSales: current.totalSales + by,
        updatedAt: new Date(),
      })
      .where(eq(sellerProfilesTable.userId, userId))
      .returning();

    if (!res) return "seller_not_found";

    return res;
  }

  async addVerificationDoc(
    userId: string,
    docUrl: string,
  ): Promise<FindSellerProfileResponse> {
    const current = await this.findSellerProfileByUserId(userId);
    if (typeof current === "string") return current;

    const updatedDocs = [...(current.verificationDocs ?? []), docUrl];

    const [res] = await db
      .update(sellerProfilesTable)
      .set({ verificationDocs: updatedDocs, updatedAt: new Date() })
      .where(eq(sellerProfilesTable.userId, userId))
      .returning();

    if (!res) return "seller_not_found";

    return res;
  }

  async softDeleteSellerProfile(userId: string): Promise<boolean> {
    const [res] = await db
      .update(sellerProfilesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(sellerProfilesTable.userId, userId))
      .returning();

    return !!res;
  }

  async hardDeleteSellerProfile(userId: string): Promise<boolean> {
    const res = await db
      .delete(sellerProfilesTable)
      .where(eq(sellerProfilesTable.userId, userId))
      .returning();

    return res.length > 0;
  }
}
