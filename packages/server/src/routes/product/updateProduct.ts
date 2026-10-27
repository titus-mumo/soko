import Elysia, { t } from "elysia";
import { CONTACT_INFO_MESSAGE } from "../../lib/contact-filter";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  updateProduct,
  publishProduct,
  unpublishProduct,
} from "../../services/product.service";

export const UpdateProduct = new Elysia().use(adminPlugin).patch(
  "/:productId",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await updateProduct(params.productId, body);

    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }
    if (result === "contact_info") {
      set.status = 400;
      return { success: false, message: CONTACT_INFO_MESSAGE };
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
  .use(adminPlugin)
  .patch("/:productId/publish", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await publishProduct(params.productId);

    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product published successfully." };
  });

export const UnpublishProduct = new Elysia()
  .use(adminPlugin)
  .patch("/:productId/unpublish", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await unpublishProduct(params.productId);

    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product unpublished successfully." };
  });
