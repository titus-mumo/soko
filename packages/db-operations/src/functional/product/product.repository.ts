import { db } from "src/db";
import { pageNewestFirst, type Page, type PageParams } from "../../pagination";
import { productsTable } from "src/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type ProductCondition = "new" | "used" | "refurbished";
export type ProductStatus = "draft" | "active" | "suspended" | "out_of_stock";

export type FindProductResponse = Product | "product_not_found";

export class ProductRepository {
  /** How many of a seller's listings are at each status. */
  async countBySellerAndStatus(
    sellerId: string,
  ): Promise<Partial<Record<ProductStatus, number>>> {
    const rows = await db
      .select({
        status: productsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.sellerId, sellerId),
          isNull(productsTable.deletedAt),
        ),
      )
      .groupBy(productsTable.status);
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  }

  // Paged, newest first: all of a seller's own listings (any status).
  async pageProductsBySellerId(
    sellerId: string,
    params?: PageParams,
  ): Promise<Page<Product>> {
    return pageNewestFirst<Product>(
      productsTable,
      and(
        eq(productsTable.sellerId, sellerId),
        isNull(productsTable.deletedAt),
      ),
      params,
    );
  }

  async insertProduct(product: NewProduct): Promise<Product | null> {
    const [res] = await db.insert(productsTable).values(product).returning();

    return res ?? null;
  }

  async findProductById(id: string): Promise<FindProductResponse> {
    const [res] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, id), isNull(productsTable.deletedAt)));

    if (!res) return "product_not_found";

    return res;
  }

  async findProductBySlug(slug: string): Promise<FindProductResponse> {
    const [res] = await db
      .select()
      .from(productsTable)
      .where(
        and(eq(productsTable.slug, slug), isNull(productsTable.deletedAt)),
      );

    if (!res) return "product_not_found";

    return res;
  }

  // Returns all non-deleted products belonging to a seller.
  // Use this for seller dashboard listings.
  async findProductsBySellerId(sellerId: string): Promise<Product[]> {
    return await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.sellerId, sellerId),
          isNull(productsTable.deletedAt),
        ),
      );
  }

  // Returns only active products for a seller.
  // Use this for public-facing storefronts.
  async findActiveProductsBySellerId(sellerId: string): Promise<Product[]> {
    return await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.sellerId, sellerId),
          eq(productsTable.status, "active"),
          isNull(productsTable.deletedAt),
        ),
      );
  }

  // Returns all active products under a category.
  // Use this for category browsing pages.
  async findActiveProductsByCategoryId(categoryId: string): Promise<Product[]> {
    return await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.categoryId, categoryId),
          eq(productsTable.status, "active"),
          isNull(productsTable.deletedAt),
        ),
      );
  }

  async updateProduct(
    id: string,
    sellerId: string,
    data: Partial<NewProduct>,
  ): Promise<FindProductResponse> {
    // sellerId is included in the where clause to prevent a seller
    // from updating another seller's product by guessing a product UUID.
    const [res] = await db
      .update(productsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(productsTable.id, id),
          eq(productsTable.sellerId, sellerId),
          isNull(productsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "product_not_found";

    return res;
  }

  async updateProductStatus(
    id: string,
    sellerId: string,
    status: ProductStatus,
  ): Promise<FindProductResponse> {
    const [res] = await db
      .update(productsTable)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(productsTable.id, id),
          eq(productsTable.sellerId, sellerId),
          isNull(productsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "product_not_found";

    return res;
  }

  // Soft deletes the product and suspends it to prevent it from
  // appearing in any active listings before the deletion is finalised.
  async softDeleteProduct(id: string, sellerId: string): Promise<boolean> {
    const [res] = await db
      .update(productsTable)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        status: "suspended",
      })
      .where(
        and(
          eq(productsTable.id, id),
          eq(productsTable.sellerId, sellerId),
          isNull(productsTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Permanently removes a product. Only use for admin-level cleanup
  // or when no orders reference this product.
  async hardDeleteProduct(id: string): Promise<boolean> {
    const res = await db
      .delete(productsTable)
      .where(eq(productsTable.id, id))
      .returning();

    return res.length > 0;
  }
}
