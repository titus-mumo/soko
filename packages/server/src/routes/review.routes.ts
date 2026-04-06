import Elysia, { t } from "elysia";
import {
  adminPlugin,
  authPlugin,
  sellerPlugin,
} from "../middleware/auth.middleware";
import {
  createReview,
  getProductReviews,
  getSellerReviews,
  getBuyerReviews,
  getAverageProductRating,
  getAverageSellerRating,
  updateReviewComment,
  deleteReview,
  adminDeleteReview,
} from "../services/review.service";

export const reviewRoutes = new Elysia({ prefix: "/reviews" })

  // ─────────────────────────────────────────
  // Public
  // ─────────────────────────────────────────

  // Get all reviews for a product.
  .get("/product/:productId", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductReviews(params.productId);
    return { success: true, data: result };
  })

  // Get average rating for a product.
  .get("/product/:productId/rating", async (ctx) => {
    const { params } = ctx as any;
    const result = await getAverageProductRating(params.productId);
    return { success: true, data: { averageRating: result } };
  })

  // Get all reviews for a seller.
  .get("/seller/:sellerId", async (ctx) => {
    const { params } = ctx as any;
    const result = await getSellerReviews(params.sellerId);
    return { success: true, data: result };
  })

  // Get average rating for a seller.
  .get("/seller/:sellerId/rating", async (ctx) => {
    const { params } = ctx as any;
    const result = await getAverageSellerRating(params.sellerId);
    return { success: true, data: { averageRating: result } };
  })

  // ─────────────────────────────────────────
  // Buyer
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(authPlugin)

      // Get all reviews written by the current buyer.
      .get("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getBuyerReviews(userId);
        return { success: true, data: result };
      })

      // Create a review for a delivered order item.
      .post(
        "/",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await createReview(userId, body);

          if (result === "order_item_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Order item not found." };
          }

          if (result === "order_not_delivered") {
            ctx.set.status = 400;
            return {
              success: false,
              message: "You can only review delivered items.",
            };
          }

          if (result === "already_reviewed") {
            ctx.set.status = 409;
            return {
              success: false,
              message: "You have already reviewed this item.",
            };
          }

          if (result === "invalid_rating") {
            ctx.set.status = 400;
            return {
              success: false,
              message: "Rating must be between 1 and 5.",
            };
          }

          ctx.set.status = 201;
          return { success: true, message: "Review submitted successfully." };
        },
        {
          body: t.Object({
            orderItemId: t.String(),
            rating: t.Number({ minimum: 1, maximum: 5 }),
            comment: t.Optional(t.String()),
          }),
        },
      )

      // Update the comment on an existing review.
      // Rating is immutable after submission.
      .patch(
        "/:reviewId",
        async (ctx) => {
          const { userId, params, body } = ctx as any;
          const result = await updateReviewComment(
            userId,
            params.reviewId,
            body.comment,
          );

          if (result === "review_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Review not found." };
          }

          return { success: true, message: "Review updated successfully." };
        },
        {
          body: t.Object({
            comment: t.String({ minLength: 1 }),
          }),
        },
      )

      // Soft delete a review written by the current buyer.
      .delete("/:reviewId", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await deleteReview(userId, params.reviewId);

        if (result === "review_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Review not found." };
        }

        return { success: true, message: "Review deleted successfully." };
      }),
  )

  // ─────────────────────────────────────────
  // Admin
  // ─────────────────────────────────────────

  .group("/admin", (app) =>
    app
      .use(adminPlugin())

      // Hard delete a review that violates platform policy.
      .delete("/:reviewId", async (ctx) => {
        const { params } = ctx as any;
        const result = await adminDeleteReview(params.reviewId);

        if (result === "review_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Review not found." };
        }

        return { success: true, message: "Review removed successfully." };
      }),
  );
