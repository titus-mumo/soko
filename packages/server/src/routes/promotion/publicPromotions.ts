import Elysia, { t } from "elysia";
import { previewPromoCode } from "../../services/promotion.service";

export const PreviewPromoCode = new Elysia().post(
  "/preview",
  async (ctx) => {
    const { body, set } = ctx as any;
    const result = await previewPromoCode(body.code, body.orderAmount);

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
      code: t.String(),
      orderAmount: t.Number({ minimum: 0 }),
    }),
  },
);
