import Elysia, { t } from "elysia";
import { CONTACT_INFO_MESSAGE } from "../../lib/contact-filter";
import { authPlugin } from "../../middleware/auth.middleware";
import { createReview } from "../../services/review.service";

export const CreateReview = new Elysia().use(authPlugin).post(
  "/me",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await createReview(userId, body);

    if (result === "order_item_not_found") {
      set.status = 404;
      return { success: false, message: "Order item not found." };
    }
    if (result === "order_not_delivered") {
      set.status = 400;
      return {
        success: false,
        message: "You can only review delivered items.",
      };
    }
    if (result === "already_reviewed") {
      set.status = 409;
      return {
        success: false,
        message: "You have already reviewed this item.",
      };
    }
    if (result === "contact_info") {
      set.status = 400;
      return { success: false, message: CONTACT_INFO_MESSAGE };
    }
    if (result === "invalid_rating") {
      set.status = 400;
      return { success: false, message: "Rating must be between 1 and 5." };
    }

    set.status = 201;
    return { success: true, message: "Review submitted successfully." };
  },
  {
    body: t.Object({
      orderItemId: t.String(),
      rating: t.Integer({ minimum: 1, maximum: 5 }),
      comment: t.Optional(t.String()),
    }),
  },
);
