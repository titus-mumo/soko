import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import { applyPromoCode } from "../../services/promotion.service";

export const ApplyPromoCode = new Elysia().use(authPlugin).post(
  "/me/apply",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await applyPromoCode(userId, body.orderId, body.code);

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }
    if (result === "promotion_not_found") {
      set.status = 404;
      return { success: false, message: "Promo code not found." };
    }
    if (result === "promotion_inactive") {
      set.status = 400;
      return {
        success: false,
        message: "This promo code is no longer active.",
      };
    }
    if (result === "promotion_expired") {
      set.status = 400;
      return { success: false, message: "This promo code has expired." };
    }
    if (result === "promotion_exhausted") {
      set.status = 400;
      return {
        success: false,
        message: "This promo code has reached its usage limit.",
      };
    }
    if (result === "minimum_order_not_met") {
      set.status = 400;
      return {
        success: false,
        message:
          "Your order does not meet the minimum amount for this promo code.",
      };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      orderId: t.String(),
      code: t.String(),
    }),
  },
);
