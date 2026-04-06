import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import { createProduct } from "../../services/product.service";

export const CreateProduct = new Elysia().use(sellerPlugin).post(
  "/",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await createProduct(userId, body);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "category_not_found") {
      set.status = 404;
      return { success: false, message: "Category not found." };
    }
    if (result === "slug_taken") {
      set.status = 409;
      return { success: false, message: "Product slug is already taken." };
    }
    if (result === "no_variants") {
      set.status = 400;
      return {
        success: false,
        message: "Product must have at least one variant.",
      };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      name: t.String({ minLength: 2 }),
      slug: t.String({ minLength: 2 }),
      categoryId: t.String(),
      description: t.Optional(t.String()),
      condition: t.Union([
        t.Literal("new"),
        t.Literal("used"),
        t.Literal("refurbished"),
      ]),
      variants: t.Array(
        t.Object({
          sku: t.String(),
          size: t.Optional(t.String()),
          color: t.Optional(t.String()),
          material: t.Optional(t.String()),
          price: t.String(),
          compareAtPrice: t.Optional(t.String()),
          stockQuantity: t.Optional(t.Number()),
        }),
        { minItems: 1 },
      ),
      images: t.Optional(
        t.Array(
          t.Object({
            url: t.String(),
            isPrimary: t.Optional(t.Boolean()),
            sortOrder: t.Optional(t.Number()),
            variantId: t.Optional(t.String()),
          }),
        ),
      ),
      tags: t.Optional(t.Array(t.String())),
    }),
  },
);
