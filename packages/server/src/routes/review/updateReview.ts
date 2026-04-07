import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import { updateReviewComment } from "../../services/review.service";

export const UpdateReviewComment = new Elysia().use(authPlugin).patch(
  "/me/:reviewId",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await updateReviewComment(
      userId,
      params.reviewId,
      body.comment,
    );

    if (result === "review_not_found") {
      set.status = 404;
      return { success: false, message: "Review not found." };
    }

    return { success: true, message: "Review updated successfully." };
  },
  {
    body: t.Object({
      comment: t.String({ minLength: 1 }),
    }),
  },
);
