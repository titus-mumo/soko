import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import { createSellerProfile } from "../../services/seller.service";

export const OnboardSeller = new Elysia().use(authPlugin).post(
  "/onboard",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await createSellerProfile(userId, body);

    if (result === "user_not_found") {
      set.status = 404;
      return { success: false, message: "User not found." };
    }
    if (result === "seller_profile_exists") {
      set.status = 409;
      return { success: false, message: "Seller profile already exists." };
    }
    if (result === "slug_taken") {
      set.status = 409;
      return { success: false, message: "Store slug is already taken." };
    }

    set.status = 201;
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
);
