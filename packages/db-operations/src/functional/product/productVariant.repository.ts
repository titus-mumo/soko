import { db } from "src/db";
import { productVariantsTable } from "src/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export type ProductVariant = typeof productVariantsTable.$inferSelect;
export type NewProductVariant = typeof productVariantsTable.$inferInsert;

export type FindProductVariantResponse = ProductVariant | "variant_not_found";

export class ProductVariantRepository {
  async insertVariant(
    variant: NewProductVariant,
  ): Promise<ProductVariant | null> {
    const [res] = await db
      .insert(productVariantsTable)
      .values(variant)
      .returning();

    return res ?? null;
  }

  // Bulk insert for when a product is created with multiple variants at once.
  async insertVariants(
    variants: NewProductVariant[],
  ): Promise<ProductVariant[]> {
    if (variants.length === 0) return [];

    return await db.insert(productVariantsTable).values(variants).returning();
  }

  async findVariantById(id: string): Promise<FindProductVariantResponse> {
    const [res] = await db
      .select()
      .from(productVariantsTable)
      .where(
        and(
          eq(productVariantsTable.id, id),
          isNull(productVariantsTable.deletedAt),
        ),
      );

    if (!res) return "variant_not_found";

    return res;
  }

  async findVariantBySku(sku: string): Promise<FindProductVariantResponse> {
    const [res] = await db
      .select()
      .from(productVariantsTable)
      .where(
        and(
          eq(productVariantsTable.sku, sku),
          isNull(productVariantsTable.deletedAt),
        ),
      );

    if (!res) return "variant_not_found";

    return res;
  }

  // Returns all active variants for a product.
  // Use this for product detail pages and checkout stock checks.
  async findVariantsByProductId(productId: string): Promise<ProductVariant[]> {
    return await db
      .select()
      .from(productVariantsTable)
      .where(
        and(
          eq(productVariantsTable.productId, productId),
          isNull(productVariantsTable.deletedAt),
        ),
      );
  }

  async updateVariant(
    id: string,
    productId: string,
    data: Partial<NewProductVariant>,
  ): Promise<FindProductVariantResponse> {
    // productId is scoped in the where clause to prevent cross-product
    // variant mutations by guessing a variant UUID.
    const [res] = await db
      .update(productVariantsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(productVariantsTable.id, id),
          eq(productVariantsTable.productId, productId),
          isNull(productVariantsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "variant_not_found";

    return res;
  }

  // Adjusts stock by a delta — pass a positive value to add stock,
  // negative to deduct. Clamps at 0 to prevent negative stock quantities.
  async adjustStock(
    id: string,
    delta: number,
  ): Promise<FindProductVariantResponse> {
    const [res] = await db
      .update(productVariantsTable)
      .set({
        stockQuantity: sql`GREATEST(${productVariantsTable.stockQuantity} + ${delta}, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productVariantsTable.id, id),
          isNull(productVariantsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "variant_not_found";

    return res;
  }

  // Hard-sets stock to an exact quantity. Use for inventory sync
  // or manual stock corrections from the seller dashboard.
  async setStock(
    id: string,
    quantity: number,
  ): Promise<FindProductVariantResponse> {
    const [res] = await db
      .update(productVariantsTable)
      .set({ stockQuantity: quantity, updatedAt: new Date() })
      .where(
        and(
          eq(productVariantsTable.id, id),
          isNull(productVariantsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "variant_not_found";

    return res;
  }

  async softDeleteVariant(id: string, productId: string): Promise<boolean> {
    const [res] = await db
      .update(productVariantsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(productVariantsTable.id, id),
          eq(productVariantsTable.productId, productId),
          isNull(productVariantsTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Soft deletes all variants tied to a product in one query.
  // Use this when soft-deleting the parent product to cascade consistently.
  async softDeleteVariantsByProductId(productId: string): Promise<boolean> {
    const res = await db
      .update(productVariantsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(productVariantsTable.productId, productId),
          isNull(productVariantsTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  async hardDeleteVariant(id: string): Promise<boolean> {
    const res = await db
      .delete(productVariantsTable)
      .where(eq(productVariantsTable.id, id))
      .returning();

    return res.length > 0;
  }
}
