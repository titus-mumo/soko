import Elysia, { t } from "elysia";
import { pageParams, paged } from "../../lib/paging";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  getPlatformPromotions,
  createPlatformPromotion,
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
