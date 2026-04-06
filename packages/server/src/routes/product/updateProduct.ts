import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import {
  updateProduct,
  publishProduct,
  unpublishProduct,
} from "../../services/product.service";

export const UpdateProduct = new Elysia().use(sellerPlugin).patch(
  "/:productId",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await updateProduct(userId, params.productId, body);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }
    if (result === "slug_taken") {
      set.status = 409;
      return { success: false, message: "Product slug is already taken." };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2 })),
      slug: t.Optional(t.String({ minLength: 2 })),
      categoryId: t.Optional(t.String()),
      description: t.Optional(t.String()),
      condition: t.Optional(
        t.Union([
          t.Literal("new"),
          t.Literal("used"),
          t.Literal("refurbished"),
        ]),
      ),
    }),
  },
);

export const PublishProduct = new Elysia()
  .use(sellerPlugin)
  .patch("/:productId/publish", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await publishProduct(userId, params.productId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product published successfully." };
  });

export const UnpublishProduct = new Elysia()
  .use(sellerPlugin)
  .patch("/:productId/unpublish", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await unpublishProduct(userId, params.productId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product unpublished successfully." };
  });
