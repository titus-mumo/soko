import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import {
  addVariant,
  updateVariant,
  adjustVariantStock,
  deleteVariant,
} from "../../services/product.service";

export const AddVariant = new Elysia().use(sellerPlugin).post(
  "/:productId/variants",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await addVariant(userId, params.productId, body);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
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
      stockQuantity: t.Optional(t.Number()),
    }),
  },
);

export const UpdateVariant = new Elysia().use(sellerPlugin).patch(
  "/:productId/variants/:variantId",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await updateVariant(
      userId,
      params.productId,
      params.variantId,
      body,
    );

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
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
      stockQuantity: t.Optional(t.Number()),
    }),
  },
);

export const AdjustVariantStock = new Elysia().use(sellerPlugin).patch(
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
      delta: t.Number(),
    }),
  },
);

export const DeleteVariant = new Elysia()
  .use(sellerPlugin)
  .delete("/:productId/variants/:variantId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await deleteVariant(
      userId,
      params.productId,
      params.variantId,
    );

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (!result) {
      set.status = 404;
      return { success: false, message: "Variant not found." };
    }

    return { success: true, message: "Variant deleted successfully." };
  });
