import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import {
  getSellerProfile,
  updateSellerProfile,
  uploadVerificationDoc,
  deleteSellerProfile,
} from "../../services/seller.service";

export const GetSellerProfile = new Elysia()
  .use(sellerPlugin)
  .get("/me", async (ctx) => {
    const { userId, set } = ctx as any;
    const result = await getSellerProfile(userId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }

    return { success: true, data: result };
  });

export const UpdateSellerProfile = new Elysia().use(sellerPlugin).patch(
  "/me",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await updateSellerProfile(userId, body);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "slug_taken") {
      set.status = 409;
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
);

export const UploadVerificationDoc = new Elysia().use(sellerPlugin).post(
  "/me/verification-docs",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await uploadVerificationDoc(userId, body.docUrl);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }

    return { success: true, message: "Verification document uploaded." };
  },
  {
    body: t.Object({
      docUrl: t.String(),
    }),
  },
);

export const DeleteSellerProfile = new Elysia()
  .use(sellerPlugin)
  .delete("/me", async (ctx) => {
    const { userId, set } = ctx as any;
    const result = await deleteSellerProfile(userId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }

    return { success: true, message: "Seller profile deleted successfully." };
  });
