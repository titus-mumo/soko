import Elysia, { t } from "elysia";
import { pageParams, paged } from "../../lib/paging";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  getPlatformPromotions,
  createPlatformPromotion,
  setPromotionActive,
  deletePromotion,
} from "../../services/promotion.service";

export const GetPlatformPromotions = new Elysia()
  .use(adminPlugin)
  .get("/admin", async (ctx) => {
    const { query } = ctx as any;
    return paged(await getPlatformPromotions(pageParams(query)));
  });

export const CreatePlatformPromotion = new Elysia().use(adminPlugin).post(
  "/admin",
  async (ctx) => {
    const { body, set } = ctx as any;
    const result = await createPlatformPromotion(body);

    if (result === "code_taken") {
      set.status = 409;
      return { success: false, message: "Promo code is already in use." };
    }
    if (!result) {
      set.status = 500;
      return { success: false, message: "Failed to create promotion." };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      code: t.String({ minLength: 3 }),
      type: t.Union([t.Literal("percent"), t.Literal("fixed")]),
      value: t.String(),
      minOrderAmount: t.Optional(t.String()),
      maxUses: t.Optional(t.Number({ minimum: 1 })),
      expiresAt: t.Optional(t.String()),
    }),
  },
);

const toggle = (active: boolean) =>
  new Elysia()
    .use(adminPlugin)
    .patch(
      `/admin/:promotionId/${active ? "activate" : "deactivate"}`,
      async (ctx) => {
        const { params, set } = ctx as any;
        const result = await setPromotionActive(params.promotionId, active);
        if (result === "promotion_not_found") {
          set.status = 404;
          return { success: false, message: "Promotion not found." };
        }
        return {
          success: true,
          message: `Promotion ${active ? "activated" : "deactivated"}.`,
        };
      },
    );

export const ActivatePromotion = toggle(true);
export const DeactivatePromotion = toggle(false);

export const DeletePromotion = new Elysia()
  .use(adminPlugin)
  .delete("/admin/:promotionId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deletePromotion(params.promotionId);
    if (result === "promotion_not_found") {
      set.status = 404;
      return { success: false, message: "Promotion not found." };
    }
    return { success: true, message: "Promotion deleted." };
  });
