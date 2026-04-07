import Elysia from "elysia";
import { authPlugin, adminPlugin } from "../../middleware/auth.middleware";
import { deleteReview, adminDeleteReview } from "../../services/review.service";

// Buyer — soft delete own review
export const DeleteReview = new Elysia()
  .use(authPlugin)
  .delete("/me/:reviewId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await deleteReview(userId, params.reviewId);

    if (result === "review_not_found") {
      set.status = 404;
      return { success: false, message: "Review not found." };
    }

    return { success: true, message: "Review deleted successfully." };
  });

// Admin — hard delete policy-violating review
export const AdminDeleteReview = new Elysia()
  .use(adminPlugin)
  .delete("/admin/:reviewId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await adminDeleteReview(params.reviewId);

    if (result === "review_not_found") {
      set.status = 404;
      return { success: false, message: "Review not found." };
    }

    return { success: true, message: "Review removed successfully." };
  });
