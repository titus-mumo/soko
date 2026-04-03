import { db } from "src/db";
import { reviewsTable } from "src/schema";
import { eq, and, isNull, avg } from "drizzle-orm";

export type Review = typeof reviewsTable.$inferSelect;
export type NewReview = typeof reviewsTable.$inferInsert;

export type FindReviewResponse = Review | "review_not_found";

export class ReviewRepository {
  // isVerifiedPurchase defaults to true since reviews are only
  // created post-delivery via an order item reference.
  async insertReview(review: NewReview): Promise<Review | null> {
    const [res] = await db.insert(reviewsTable).values(review).returning();

    return res ?? null;
  }

  async findReviewById(id: string): Promise<FindReviewResponse> {
    const [res] = await db
      .select()
      .from(reviewsTable)
      .where(and(eq(reviewsTable.id, id), isNull(reviewsTable.deletedAt)));

    if (!res) return "review_not_found";

    return res;
  }

  // Enforces one review per order item per reviewer at the DB query level.
  // Use this before insertReview to prevent duplicate reviews.
  async findReviewByOrderItemId(
    orderItemId: string,
    reviewerId: string,
  ): Promise<FindReviewResponse> {
    const [res] = await db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.orderItemId, orderItemId),
          eq(reviewsTable.reviewerId, reviewerId),
          isNull(reviewsTable.deletedAt),
        ),
      );

    if (!res) return "review_not_found";

    return res;
  }

  // Returns all reviews for a product ordered by most recent first.
  // Use this for the product detail page review section.
  async findReviewsByProductId(productId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.productId, productId),
          isNull(reviewsTable.deletedAt),
        ),
      );
  }

  // Returns all reviews received by a seller.
  // Use this for the seller's public profile and reputation display.
  async findReviewsBySellerId(sellerId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.sellerId, sellerId),
          isNull(reviewsTable.deletedAt),
        ),
      );
  }

  // Returns all reviews written by a buyer.
  // Use this for the buyer's review history page.
  async findReviewsByReviewerId(reviewerId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.reviewerId, reviewerId),
          isNull(reviewsTable.deletedAt),
        ),
      );
  }

  // Computes the average rating for a product across all non-deleted reviews.
  // Use this to update the cached rating on the product or seller profile
  // after every insert or soft delete.
  async getAverageRatingForProduct(productId: string): Promise<string | null> {
    const [res] = await db
      .select({ average: avg(reviewsTable.rating) })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.productId, productId),
          isNull(reviewsTable.deletedAt),
        ),
      );

    return res?.average ?? null;
  }

  // Computes the average rating for a seller across all non-deleted reviews.
  // Pass this result into SellerProfileRepository.updateRating after any review change.
  async getAverageRatingForSeller(sellerId: string): Promise<string | null> {
    const [res] = await db
      .select({ average: avg(reviewsTable.rating) })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.sellerId, sellerId),
          isNull(reviewsTable.deletedAt),
        ),
      );

    return res?.average ?? null;
  }

  // Only the comment is editable post-submission — rating and
  // verification status are immutable once a review is created.
  async updateReviewComment(
    id: string,
    reviewerId: string,
    comment: string,
  ): Promise<FindReviewResponse> {
    const [res] = await db
      .update(reviewsTable)
      .set({ comment, updatedAt: new Date() })
      .where(
        and(
          eq(reviewsTable.id, id),
          eq(reviewsTable.reviewerId, reviewerId),
          isNull(reviewsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "review_not_found";

    return res;
  }

  // Soft delete only — reviews are part of the seller's reputation history
  // and must be retained for dispute resolution and audit purposes.
  async softDeleteReview(id: string, reviewerId: string): Promise<boolean> {
    const [res] = await db
      .update(reviewsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(reviewsTable.id, id),
          eq(reviewsTable.reviewerId, reviewerId),
          isNull(reviewsTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Admin-only hard delete for removing reviews that violate platform policy.
  async hardDeleteReview(id: string): Promise<boolean> {
    const res = await db
      .delete(reviewsTable)
      .where(eq(reviewsTable.id, id))
      .returning();

    return res.length > 0;
  }
}
