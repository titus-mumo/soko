import Elysia, { t } from "elysia";
import {
  authPlugin,
  adminPlugin,
  sellerPlugin,
} from "../middleware/auth.middleware";
import {
  createPromotion,
  getSellerPromotions,
  updatePromotion,
  activatePromotion,
  deactivatePromotion,
  deletePromotion,
  applyPromoCode,
  previewPromoCode,
  createPlatformPromotion,
  getPlatformPromotions,
} from "../services/promotion.service";

export const promotionRoutes = new Elysia({ prefix: "/promotions" })

  // ─────────────────────────────────────────
  // Public
  // ─────────────────────────────────────────

  // Preview a promo code discount without applying it.
  // Use this for a "check promo code" UI before checkout.
  .post(
    "/preview",
    async (ctx) => {
      const { body } = ctx as any;
      const result = await previewPromoCode(body.code, body.orderAmount);

      if (result === "promotion_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Promo code not found." };
      }

      if (result === "promotion_inactive") {
        ctx.set.status = 400;
        return {
          success: false,
          message: "This promo code is no longer active.",
        };
      }

      if (result === "promotion_expired") {
        ctx.set.status = 400;
        return { success: false, message: "This promo code has expired." };
      }

      if (result === "promotion_exhausted") {
        ctx.set.status = 400;
        return {
          success: false,
          message: "This promo code has reached its usage limit.",
        };
      }

      if (result === "minimum_order_not_met") {
        ctx.set.status = 400;
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
  )

  // ─────────────────────────────────────────
  // Buyer — Apply Promo Code
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(authPlugin)

      // Apply a promo code to an order at checkout.
      // Increments usesCount atomically on success.
      .post(
        "/apply",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await applyPromoCode(userId, body.orderId, body.code);

          if (result === "order_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Order not found." };
          }

          if (result === "promotion_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Promo code not found." };
          }

          if (result === "promotion_inactive") {
            ctx.set.status = 400;
            return {
              success: false,
              message: "This promo code is no longer active.",
            };
          }

          if (result === "promotion_expired") {
            ctx.set.status = 400;
            return { success: false, message: "This promo code has expired." };
          }

          if (result === "promotion_exhausted") {
            ctx.set.status = 400;
            return {
              success: false,
              message: "This promo code has reached its usage limit.",
            };
          }

          if (result === "minimum_order_not_met") {
            ctx.set.status = 400;
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
      ),
  )

  // ─────────────────────────────────────────
  // Seller — Promotion Management
  // ─────────────────────────────────────────

  .group("/seller", (app) =>
    app
      .use(sellerPlugin())

      // Get all promotions for the current seller.
      .get("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getSellerPromotions(userId);

        if (result === "seller_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Seller profile not found." };
        }

        return { success: true, data: result };
      })

      // Create a new promotion for the current seller.
      .post(
        "/",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await createPromotion(userId, body);

          if (result === "seller_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Seller profile not found." };
          }

          if (result === "code_taken") {
            ctx.set.status = 409;
            return { success: false, message: "Promo code is already in use." };
          }

          if (!result) {
            ctx.set.status = 500;
            return { success: false, message: "Failed to create promotion." };
          }

          ctx.set.status = 201;
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
      )

      // Update a promotion.
      .patch(
        "/:promotionId",
        async (ctx) => {
          const { userId, params, body } = ctx as any;
          const result = await updatePromotion(
            userId,
            params.promotionId,
            body,
          );

          if (result === "seller_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Seller profile not found." };
          }

          if (result === "promotion_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Promotion not found." };
          }

          if (result === "code_taken") {
            ctx.set.status = 409;
            return { success: false, message: "Promo code is already in use." };
          }

          return { success: true, data: result };
        },
        {
          body: t.Object({
            code: t.Optional(t.String({ minLength: 3 })),
            type: t.Optional(
              t.Union([t.Literal("percent"), t.Literal("fixed")]),
            ),
            value: t.Optional(t.String()),
            minOrderAmount: t.Optional(t.String()),
            maxUses: t.Optional(t.Number({ minimum: 1 })),
            expiresAt: t.Optional(t.String()),
            isActive: t.Optional(t.Boolean()),
          }),
        },
      )

      // Activate a promotion.
      .patch("/:promotionId/activate", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await activatePromotion(userId, params.promotionId);

        if (result === "seller_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Seller profile not found." };
        }

        if (result === "promotion_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Promotion not found." };
        }

        return { success: true, message: "Promotion activated." };
      })

      // Deactivate a promotion.
      .patch("/:promotionId/deactivate", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await deactivatePromotion(userId, params.promotionId);

        if (result === "seller_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Seller profile not found." };
        }

        if (result === "promotion_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Promotion not found." };
        }

        return { success: true, message: "Promotion deactivated." };
      })

      // Soft delete a promotion.
      .delete("/:promotionId", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await deletePromotion(userId, params.promotionId);

        if (result === "seller_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Seller profile not found." };
        }

        if (result === "promotion_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Promotion not found." };
        }

        return { success: true, message: "Promotion deleted." };
      }),
  )

  // ─────────────────────────────────────────
  // Admin — Platform Promotions
  // ─────────────────────────────────────────

  .group("/admin", (app) =>
    app
      .use(adminPlugin())

      // Get all platform-wide promotions.
      .get("/", async (ctx) => {
        const result = await getPlatformPromotions();
        return { success: true, data: result };
      })

      // Create a platform-wide promotion not tied to any seller.
      .post(
        "/",
        async (ctx) => {
          const { body } = ctx as any;
          const result = await createPlatformPromotion(body);

          if (result === "code_taken") {
            ctx.set.status = 409;
            return { success: false, message: "Promo code is already in use." };
          }

          if (!result) {
            ctx.set.status = 500;
            return { success: false, message: "Failed to create promotion." };
          }

          ctx.set.status = 201;
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
      ),
  );
