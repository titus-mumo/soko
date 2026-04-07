import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import {
  getSellerPromotions,
  createPromotion,
  updatePromotion,
  activatePromotion,
  deactivatePromotion,
  deletePromotion,
} from "../../services/promotion.service";

export const GetSellerPromotions = new Elysia()
  .use(sellerPlugin)
  .get("/seller", async (ctx) => {
    const { userId, set } = ctx as any;
    const result = await getSellerPromotions(userId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }

    return { success: true, data: result };
  });

export const CreatePromotion = new Elysia().use(sellerPlugin).post(
  "/seller",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await createPromotion(userId, body);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
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

export const UpdatePromotion = new Elysia().use(sellerPlugin).patch(
  "/seller/:promotionId",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await updatePromotion(userId, params.promotionId, body);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "promotion_not_found") {
      set.status = 404;
      return { success: false, message: "Promotion not found." };
    }
    if (result === "code_taken") {
      set.status = 409;
      return { success: false, message: "Promo code is already in use." };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      code: t.Optional(t.String({ minLength: 3 })),
      type: t.Optional(t.Union([t.Literal("percent"), t.Literal("fixed")])),
      value: t.Optional(t.String()),
      minOrderAmount: t.Optional(t.String()),
      maxUses: t.Optional(t.Number({ minimum: 1 })),
      expiresAt: t.Optional(t.String()),
      isActive: t.Optional(t.Boolean()),
    }),
  },
);

export const ActivatePromotion = new Elysia()
  .use(sellerPlugin)
  .patch("/seller/:promotionId/activate", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await activatePromotion(userId, params.promotionId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "promotion_not_found") {
      set.status = 404;
      return { success: false, message: "Promotion not found." };
    }

    return { success: true, message: "Promotion activated." };
  });

export const DeactivatePromotion = new Elysia()
  .use(sellerPlugin)
  .patch("/seller/:promotionId/deactivate", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await deactivatePromotion(userId, params.promotionId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "promotion_not_found") {
      set.status = 404;
      return { success: false, message: "Promotion not found." };
    }

    return { success: true, message: "Promotion deactivated." };
  });

export const DeletePromotion = new Elysia()
  .use(sellerPlugin)
  .delete("/seller/:promotionId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await deletePromotion(userId, params.promotionId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "promotion_not_found") {
      set.status = 404;
      return { success: false, message: "Promotion not found." };
    }

    return { success: true, message: "Promotion deleted." };
  });
