import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  verifySeller,
  updateSellerRating,
  deleteSellerProfile,
} from "../../services/seller.service";

export const VerifySeller = new Elysia()
  .use(adminPlugin)
  .patch("/admin/:userId/verify", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await verifySeller(params.userId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller not found." };
    }

    return { success: true, message: "Seller verified successfully." };
  });

export const UpdateSellerRating = new Elysia().use(adminPlugin).patch(
  "/admin/:userId/rating",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await updateSellerRating(params.userId, body.rating);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller not found." };
    }

    return { success: true, message: "Seller rating updated." };
  },
  {
    body: t.Object({
      rating: t.String(),
    }),
  },
);

export const AdminDeleteSellerProfile = new Elysia()
  .use(adminPlugin)
  .delete("/admin/:userId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deleteSellerProfile(params.userId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller not found." };
    }

    return { success: true, message: "Seller profile deleted successfully." };
  });
