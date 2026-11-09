import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  addVariant,
  updateVariant,
  adjustVariantStock,
  deleteVariant,
} from "../../services/product.service";

export const AddVariant = new Elysia().use(adminPlugin).post(
  "/:productId/variants",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await addVariant(params.productId, body);

    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      sku: t.String(),
      size: t.Optional(t.String()),
      color: t.Optional(t.String()),
      material: t.Optional(t.String()),
      price: t.String(),
      compareAtPrice: t.Optional(t.String()),
      stockQuantity: t.Optional(t.Integer({ minimum: 0, maximum: 1_000_000 })),
    }),
  },
);

export const UpdateVariant = new Elysia().use(adminPlugin).patch(
  "/:productId/variants/:variantId",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await updateVariant(
      params.productId,
      params.variantId,
      body,
    );

    if (result === "variant_not_found") {
      set.status = 404;
      return { success: false, message: "Variant not found." };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      sku: t.Optional(t.String()),
      size: t.Optional(t.String()),
      color: t.Optional(t.String()),
      material: t.Optional(t.String()),
      price: t.Optional(t.String()),
      compareAtPrice: t.Optional(t.String()),
      stockQuantity: t.Optional(t.Integer({ minimum: 0, maximum: 1_000_000 })),
    }),
  },
);

export const AdjustVariantStock = new Elysia().use(adminPlugin).patch(
  "/:productId/variants/:variantId/stock",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await adjustVariantStock(params.variantId, body.delta);

    if (result === "variant_not_found") {
      set.status = 404;
      return { success: false, message: "Variant not found." };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      delta: t.Integer({ minimum: -1_000_000, maximum: 1_000_000 }),
    }),
  },
);

export const DeleteVariant = new Elysia()
  .use(adminPlugin)
  .delete("/:productId/variants/:variantId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deleteVariant(params.productId, params.variantId);

    if (!result) {
      set.status = 404;
      return { success: false, message: "Variant not found." };
    }

    return { success: true, message: "Variant deleted successfully." };
  });
