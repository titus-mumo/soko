import Elysia from "elysia";
import {
  getProductBySlug,
  getActiveProductsBySeller,
  getProductsByCategory,
  getProductVariants,
  getProductImages,
  getProductTags,
} from "../../services/product.service";
import { authPlugin } from "src/middleware/auth.middleware";

export const GetProductBySlug = new Elysia()
  .use(authPlugin)
  .get("/by-slug/:slug", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getProductBySlug(params.slug);
    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }
    return { success: true, data: result };
  });

export const GetProductsByCategory = new Elysia()
  .use(authPlugin)
  .get("/by-category/:categoryId", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductsByCategory(params.categoryId);
    return { success: true, data: result };
  });

export const GetProductsBySeller = new Elysia()
  .use(authPlugin)
  .get("/by-seller/:sellerId", async (ctx) => {
    const { params } = ctx as any;
    const result = await getActiveProductsBySeller(params.sellerId);
    return { success: true, data: result };
  });

export const GetProductVariants = new Elysia()
  .use(authPlugin)
  .get("/:productId/variants", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductVariants(params.productId);
    return { success: true, data: result };
  });

export const GetProductImages = new Elysia()
  .use(authPlugin)
  .get("/:productId/images", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductImages(params.productId);
    return { success: true, data: result };
  });

export const GetProductTags = new Elysia()
  .use(authPlugin)
  .get("/:productId/tags", async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductTags(params.productId);
    return { success: true, data: result };
  });
