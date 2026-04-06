import Elysia, { t } from "elysia";
import { sellerPlugin } from "../middleware/auth.middleware";
import {
  getProductBySlug,
  getActiveProductsBySeller,
  getProductsByCategory,
  createProduct,
  updateProduct,
  publishProduct,
  unpublishProduct,
  deleteProduct,
  getProductVariants,
  addVariant,
  updateVariant,
  adjustVariantStock,
  deleteVariant,
  getProductImages,
  addProductImage,
  setPrimaryImage,
  deleteProductImage,
  getProductTags,
  replaceProductTags,
} from "../services/product.service";

// ─────────────────────────────────────────
// Public Routes
// ─────────────────────────────────────────
const publicProductRoutes = new Elysia({ prefix: "/products" })

  .get("/by-slug/:slug", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductBySlug(params.slug);
    if (result === "product_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Product not found." };
    }
    return { success: true, data: result };
  })

  .get("/by-category/:categoryId", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductsByCategory(params.categoryId);
    return { success: true, data: result };
  })

  .get("/by-seller/:sellerId", async (ctx) => {
    const { params } = ctx as any;
    const result = await getActiveProductsBySeller(params.sellerId);
    return { success: true, data: result };
  })

  .get("/:productId/variants", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductVariants(params.productId);
    return { success: true, data: result };
  })

  .get("/:productId/images", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductImages(params.productId);
    return { success: true, data: result };
  })

  .get("/:productId/tags", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductTags(params.productId);
    return { success: true, data: result };
  });

// ─────────────────────────────────────────
// Seller Routes
// ─────────────────────────────────────────
const sellerProductRoutes = new Elysia({ prefix: "/products/me" })
  .use(sellerPlugin())

  .post(
    "/",
    async (ctx) => {
      const { userId, body } = ctx as any;
      const result = await createProduct(userId, body);

      if (result === "seller_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Seller profile not found." };
      }
      if (result === "category_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Category not found." };
      }
      if (result === "slug_taken") {
        ctx.set.status = 409;
        return { success: false, message: "Product slug is already taken." };
      }
      if (result === "no_variants") {
        ctx.set.status = 400;
        return {
          success: false,
          message: "Product must have at least one variant.",
        };
      }

      ctx.set.status = 201;
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
  )

  .patch(
    "/:productId",
    async (ctx) => {
      const { userId, params, body } = ctx as any;
      const result = await updateProduct(userId, params.productId, body);

      if (result === "seller_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Seller profile not found." };
      }
      if (result === "product_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Product not found." };
      }
      if (result === "slug_taken") {
        ctx.set.status = 409;
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
  )

  .patch("/:productId/publish", async (ctx) => {
    const { userId, params } = ctx as any;
    const result = await publishProduct(userId, params.productId);

    if (result === "seller_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "product_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product published successfully." };
  })

  .patch("/:productId/unpublish", async (ctx) => {
    const { userId, params } = ctx as any;
    const result = await unpublishProduct(userId, params.productId);

    if (result === "seller_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "product_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product unpublished successfully." };
  })

  .delete("/:productId", async (ctx) => {
    const { userId, params } = ctx as any;
    const result = await deleteProduct(userId, params.productId);

    if (result === "seller_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "product_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product deleted successfully." };
  })

  // ─── Variants ───────────────────────────

  .post(
    "/:productId/variants",
    async (ctx) => {
      const { userId, params, body } = ctx as any;
      const result = await addVariant(userId, params.productId, body);

      if (result === "seller_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Seller profile not found." };
      }
      if (result === "product_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Product not found." };
      }

      ctx.set.status = 201;
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
  )

  .patch(
    "/:productId/variants/:variantId",
    async (ctx) => {
      const { userId, params, body } = ctx as any;
      const result = await updateVariant(
        userId,
        params.productId,
        params.variantId,
        body,
      );

      if (result === "seller_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Seller profile not found." };
      }
      if (result === "variant_not_found") {
        ctx.set.status = 404;
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
  )

  .patch(
    "/:productId/variants/:variantId/stock",
    async (ctx) => {
      const { params, body } = ctx as any;
      const result = await adjustVariantStock(params.variantId, body.delta);

      if (result === "variant_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Variant not found." };
      }

      return { success: true, data: result };
    },
    {
      body: t.Object({
        delta: t.Number(),
      }),
    },
  )

  .delete("/:productId/variants/:variantId", async (ctx) => {
    const { userId, params } = ctx as any;
    const result = await deleteVariant(
      userId,
      params.productId,
      params.variantId,
    );

    if (result === "seller_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (!result) {
      ctx.set.status = 404;
      return { success: false, message: "Variant not found." };
    }

    return { success: true, message: "Variant deleted successfully." };
  })

  // ─── Images ─────────────────────────────

  .post(
    "/:productId/images",
    async (ctx) => {
      const { params, body } = ctx as any;
      const result = await addProductImage(params.productId, body);

      if (!result) {
        ctx.set.status = 500;
        return { success: false, message: "Failed to add image." };
      }

      ctx.set.status = 201;
      return { success: true, data: result };
    },
    {
      body: t.Object({
        url: t.String(),
        isPrimary: t.Optional(t.Boolean()),
        sortOrder: t.Optional(t.Number()),
        variantId: t.Optional(t.String()),
      }),
    },
  )

  .patch("/:productId/images/:imageId/primary", async (ctx) => {
    const { params } = ctx as any;
    const result = await setPrimaryImage(params.productId, params.imageId);

    if (result === "image_not_found") {
      ctx.set.status = 404;
      return { success: false, message: "Image not found." };
    }

    return { success: true, data: result };
  })

  .delete("/:productId/images/:imageId", async (ctx) => {
    const { params } = ctx as any;
    const result = await deleteProductImage(params.productId, params.imageId);

    if (!result) {
      ctx.set.status = 404;
      return { success: false, message: "Image not found." };
    }

    return { success: true, message: "Image deleted successfully." };
  })

  // ─── Tags ───────────────────────────────

  .put(
    "/:productId/tags",
    async (ctx) => {
      const { params, body } = ctx as any;
      const result = await replaceProductTags(params.productId, body.tags);
      return { success: true, data: result };
    },
    {
      body: t.Object({
        tags: t.Array(t.String()),
      }),
    },
  );

// ─────────────────────────────────────────
// Combined Export
// ─────────────────────────────────────────
export const productRoutes = new Elysia()
  .use(publicProductRoutes)
  .use(sellerProductRoutes);
