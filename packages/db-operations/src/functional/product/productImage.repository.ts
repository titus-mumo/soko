import { db } from "src/db";
import { productImagesTable } from "src/schema";
import { eq, and, isNull, asc } from "drizzle-orm";

export type ProductImage = typeof productImagesTable.$inferSelect;
export type NewProductImage = typeof productImagesTable.$inferInsert;

export type FindProductImageResponse = ProductImage | "image_not_found";

export class ProductImageRepository {
  async insertImage(image: NewProductImage): Promise<ProductImage | null> {
    if (image.isPrimary) {
      await this.clearPrimaryImage(image.productId);
    }

    const [res] = await db.insert(productImagesTable).values(image).returning();

    return res ?? null;
  }

  // Bulk insert for uploading multiple images at once.
  // Only one image in the batch should have isPrimary: true — the caller
  // is responsible for ensuring this constraint before calling.
  async insertImages(images: NewProductImage[]): Promise<ProductImage[]> {
    if (images.length === 0) return [];

    const hasPrimary = images.some((img) => img.isPrimary);

    if (hasPrimary) {
      await this.clearPrimaryImage(images[0].productId);
    }

    return await db.insert(productImagesTable).values(images).returning();
  }

  async findImageById(id: string): Promise<FindProductImageResponse> {
    const [res] = await db
      .select()
      .from(productImagesTable)
      .where(
        and(
          eq(productImagesTable.id, id),
          isNull(productImagesTable.deletedAt),
        ),
      );

    if (!res) return "image_not_found";

    return res;
  }

  // Returns all images for a product ordered by sortOrder ascending.
  // Use this for product detail pages and gallery rendering.
  async findImagesByProductId(productId: string): Promise<ProductImage[]> {
    return await db
      .select()
      .from(productImagesTable)
      .where(
        and(
          eq(productImagesTable.productId, productId),
          isNull(productImagesTable.deletedAt),
        ),
      )
      .orderBy(asc(productImagesTable.sortOrder));
  }

  // Returns images scoped to a specific variant, ordered by sortOrder.
  // Use this for variant swatches or variant-specific gallery views.
  async findImagesByVariantId(variantId: string): Promise<ProductImage[]> {
    return await db
      .select()
      .from(productImagesTable)
      .where(
        and(
          eq(productImagesTable.variantId, variantId),
          isNull(productImagesTable.deletedAt),
        ),
      )
      .orderBy(asc(productImagesTable.sortOrder));
  }

  // Returns the primary image for a product.
  // Use this for thumbnails on listing cards and search results.
  async findPrimaryImage(productId: string): Promise<FindProductImageResponse> {
    const [res] = await db
      .select()
      .from(productImagesTable)
      .where(
        and(
          eq(productImagesTable.productId, productId),
          eq(productImagesTable.isPrimary, true),
          isNull(productImagesTable.deletedAt),
        ),
      );

    if (!res) return "image_not_found";

    return res;
  }

  // Promotes an image to primary, clearing any existing primary first.
  async setPrimaryImage(
    id: string,
    productId: string,
  ): Promise<FindProductImageResponse> {
    await this.clearPrimaryImage(productId);

    const [res] = await db
      .update(productImagesTable)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(
        and(
          eq(productImagesTable.id, id),
          eq(productImagesTable.productId, productId),
          isNull(productImagesTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "image_not_found";

    return res;
  }

  // Updates the sortOrder for a single image.
  // For reordering a full gallery, call this per image or handle in a transaction upstream.
  async updateSortOrder(
    id: string,
    productId: string,
    sortOrder: number,
  ): Promise<FindProductImageResponse> {
    const [res] = await db
      .update(productImagesTable)
      .set({ sortOrder, updatedAt: new Date() })
      .where(
        and(
          eq(productImagesTable.id, id),
          eq(productImagesTable.productId, productId),
          isNull(productImagesTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "image_not_found";

    return res;
  }

  async softDeleteImage(id: string, productId: string): Promise<boolean> {
    const [res] = await db
      .update(productImagesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isPrimary: false })
      .where(
        and(
          eq(productImagesTable.id, id),
          eq(productImagesTable.productId, productId),
          isNull(productImagesTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Soft deletes all images tied to a product in one query.
  // Use when soft-deleting the parent product to cascade consistently.
  async softDeleteImagesByProductId(productId: string): Promise<boolean> {
    const res = await db
      .update(productImagesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isPrimary: false })
      .where(
        and(
          eq(productImagesTable.productId, productId),
          isNull(productImagesTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  async hardDeleteImage(id: string): Promise<boolean> {
    const res = await db
      .delete(productImagesTable)
      .where(eq(productImagesTable.id, id))
      .returning();

    return res.length > 0;
  }

  private async clearPrimaryImage(productId: string): Promise<void> {
    await db
      .update(productImagesTable)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(
        and(
          eq(productImagesTable.productId, productId),
          eq(productImagesTable.isPrimary, true),
          isNull(productImagesTable.deletedAt),
        ),
      );
  }
}
