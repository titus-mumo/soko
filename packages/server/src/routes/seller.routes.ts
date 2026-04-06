import Elysia, { t } from "elysia";
import {
  authPlugin,
  adminPlugin,
  sellerPlugin,
} from "../middleware/auth.middleware";
import {
  createSellerProfile,
  getSellerProfile,
  getSellerProfileBySlug,
  updateSellerProfile,
  uploadVerificationDoc,
  verifySeller,
  updateSellerRating,
  deleteSellerProfile,
} from "../services/seller.service";

export const sellerRoutes = new Elysia({ prefix: "/sellers" })

  // ─────────────────────────────────────────
  // Public
  // ─────────────────────────────────────────

  // Get a seller's public profile by store slug.
  // Use this for public storefront pages.
  .get("/:slug", async (ctx) => {
    const { params } = ctx as any;
    const result = await getSellerProfileBySlug(params.slug);

    if (result === "seller_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Seller not found." };
    }

    return { success: true, data: result };
  })

  // ─────────────────────────────────────────
  // Seller — Onboarding
  // ─────────────────────────────────────────

  .group("/onboard", (app) =>
    app
      .use(authPlugin)

      // Create a seller profile for the current user.
      .post(
        "/",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await createSellerProfile(userId, body);

          if (result === "user_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "User not found." };
          }

          if (result === "seller_profile_exists") {
            ctx.set.status = 409;
            return {
              success: false,
              message: "Seller profile already exists.",
            };
          }

          if (result === "slug_taken") {
            ctx.set.status = 409;
            return { success: false, message: "Store slug is already taken." };
          }

          ctx.set.status = 201;
          return { success: true, data: result };
        },
        {
          body: t.Object({
            storeName: t.String({ minLength: 2 }),
            storeSlug: t.String({ minLength: 2 }),
            storeDescription: t.Optional(t.String()),
            storeLogo: t.Optional(t.String()),
          }),
        },
      ),
  )

  // ─────────────────────────────────────────
  // Seller — Profile Management
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(sellerPlugin())

      // Get current seller's profile.
      .get("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getSellerProfile(userId);

        if (result === "seller_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Seller profile not found." };
        }

        return { success: true, data: result };
      })

      // Update current seller's profile.
      .patch(
        "/",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await updateSellerProfile(userId, body);

          if (result === "seller_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Seller profile not found." };
          }

          if (result === "slug_taken") {
            ctx.set.status = 409;
            return { success: false, message: "Store slug is already taken." };
          }

          return { success: true, data: result };
        },
        {
          body: t.Object({
            storeName: t.Optional(t.String({ minLength: 2 })),
            storeSlug: t.Optional(t.String({ minLength: 2 })),
            storeDescription: t.Optional(t.String()),
            storeLogo: t.Optional(t.String()),
          }),
        },
      )

      // Upload a verification document.
      .post(
        "/verification-docs",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await uploadVerificationDoc(userId, body.docUrl);

          if (result === "seller_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Seller profile not found." };
          }

          return { success: true, message: "Verification document uploaded." };
        },
        {
          body: t.Object({
            docUrl: t.String(),
          }),
        },
      )

      // Delete current seller's profile.
      .delete("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await deleteSellerProfile(userId);

        if (result === "seller_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Seller profile not found." };
        }

        return {
          success: true,
          message: "Seller profile deleted successfully.",
        };
      }),
  )

  // ─────────────────────────────────────────
  // Admin
  // ─────────────────────────────────────────

  .group("/admin", (app) =>
    app
      .use(adminPlugin())

      // Verify a seller's account.
      .patch("/:userId/verify", async (ctx) => {
        const { params } = ctx as any;
        const result = await verifySeller(params.userId);

        if (result === "seller_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Seller not found." };
        }

        return { success: true, message: "Seller verified successfully." };
      })

      // Update a seller's rating manually.
      // In production this is computed automatically from reviews.
      .patch(
        "/:userId/rating",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await updateSellerRating(params.userId, body.rating);

          if (result === "seller_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Seller not found." };
          }

          return { success: true, message: "Seller rating updated." };
        },
        {
          body: t.Object({
            rating: t.String(),
          }),
        },
      )

      // Delete a seller's profile.
      .delete("/:userId", async (ctx) => {
        const { params } = ctx as any;
        const result = await deleteSellerProfile(params.userId);

        if (result === "seller_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Seller not found." };
        }

        return {
          success: true,
          message: "Seller profile deleted successfully.",
        };
      }),
  );
