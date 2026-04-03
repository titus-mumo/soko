import { db } from "src/db";
import { productTagsTable } from "src/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

export type ProductTag = typeof productTagsTable.$inferSelect;
export type NewProductTag = typeof productTagsTable.$inferInsert;

export type FindProductTagResponse = ProductTag | "tag_not_found";

export class ProductTagRepository {
  async insertTag(tag: NewProductTag): Promise<ProductTag | null> {
    const [res] = await db.insert(productTagsTable).values(tag).returning();

    return res ?? null;
  }

  // Bulk insert for attaching multiple tags to a product at once.
  // Use this on product creation or when replacing the full tag set.
  async insertTags(tags: NewProductTag[]): Promise<ProductTag[]> {
    if (tags.length === 0) return [];

    return await db.insert(productTagsTable).values(tags).returning();
  }

  async findTagById(id: string): Promise<FindProductTagResponse> {
    const [res] = await db
      .select()
      .from(productTagsTable)
      .where(
        and(eq(productTagsTable.id, id), isNull(productTagsTable.deletedAt)),
      );

    if (!res) return "tag_not_found";

    return res;
  }

  // Returns all active tags for a product.
  // Use this for product detail pages and tag display.
  async findTagsByProductId(productId: string): Promise<ProductTag[]> {
    return await db
      .select()
      .from(productTagsTable)
      .where(
        and(
          eq(productTagsTable.productId, productId),
          isNull(productTagsTable.deletedAt),
        ),
      );
  }

  // Replaces the entire tag set for a product in two steps:
  // soft delete all existing tags, then insert the new ones.
  // Use this when the seller updates tags from the product editor.
  async replaceProductTags(
    productId: string,
    tags: string[],
  ): Promise<ProductTag[]> {
    await this.softDeleteTagsByProductId(productId);

    if (tags.length === 0) return [];

    return await db
      .insert(productTagsTable)
      .values(tags.map((tag) => ({ productId, tag })))
      .returning();
  }

  async softDeleteTag(id: string, productId: string): Promise<boolean> {
    const [res] = await db
      .update(productTagsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(productTagsTable.id, id),
          eq(productTagsTable.productId, productId),
          isNull(productTagsTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Soft deletes all tags for a product in one query.
  // Used internally by replaceProductTags and when soft-deleting the parent product.
  async softDeleteTagsByProductId(productId: string): Promise<boolean> {
    const res = await db
      .update(productTagsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(productTagsTable.productId, productId),
          isNull(productTagsTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  // Soft deletes a specific set of tags by their IDs in one query.
  // Use this when the seller removes individual tags from the product editor.
  async softDeleteTagsByIds(
    ids: string[],
    productId: string,
  ): Promise<boolean> {
    if (ids.length === 0) return false;

    const res = await db
      .update(productTagsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          inArray(productTagsTable.id, ids),
          eq(productTagsTable.productId, productId),
          isNull(productTagsTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  async hardDeleteTag(id: string): Promise<boolean> {
    const res = await db
      .delete(productTagsTable)
      .where(eq(productTagsTable.id, id))
      .returning();

    return res.length > 0;
  }
}
