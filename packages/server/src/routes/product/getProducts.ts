import Elysia, { t } from "elysia";
import { pageParams, paged } from "../../lib/paging";
import {
  browseCatalogue,
  getCatalogueStats,
  getPublicProductBySlug,
  getProductsByCategory,
  getProductVariants,
  getProductImages,
  getProductTags,
  getManagedProducts,
  getManagedProduct,
  getCatalogueCounts,
  getVariantDetails,
} from "../../services/product.service";
import { adminPlugin } from "src/middleware/auth.middleware";
import {
  publicImage,
  publicTag,
  publicVariant,
  publicVariantDetails,
} from "../../lib/views";
import { ownerListing, publicProduct } from "../../lib/views";

// Public — browse the catalogue: filter, search, sort, page. Card-ready rows.
export const BrowseProducts = new Elysia().get(
  "/",
  async (ctx) => {
    const { query, set } = ctx as any;
    const result = await browseCatalogue({
      category: query.category,
      q: query.q,
      sort: query.sort,
      page: pageParams(query),
    });
    if (result === "category_not_found") {
      set.status = 404;
      return { success: false, message: "Category not found." };
    }
    return paged(result);
  },
  {
    query: t.Object({
      category: t.Optional(t.String()),
      q: t.Optional(t.String()),
      sort: t.Optional(
        t.Union([
          t.Literal("newest"),
          t.Literal("price_asc"),
          t.Literal("price_desc"),
        ]),
      ),
      limit: t.Optional(t.String()),
      cursor: t.Optional(t.String()),
    }),
  },
);

// Public — headline counts (live listings, stores selling).
export const GetCatalogueStats = new Elysia().get("/stats", async () => ({
  success: true,
  data: await getCatalogueStats(),
}));

// Public — catalog reads need no login (crawlers, guests).
export const GetProductBySlug = new Elysia().get(
  "/by-slug/:slug",
  async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getPublicProductBySlug(params.slug);
    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }
    return {
      success: true,
      data: publicProduct(result.product, result.seller),
    };
  },
);

// Public — catalog reads need no login (crawlers, guests).
export const GetProductsByCategory = new Elysia().get(
  "/by-category/:categoryId",
  async (ctx) => {
    const { params, query } = ctx as any;
    return paged(
      await getProductsByCategory(params.categoryId, pageParams(query)),
    );
  },
);

// Public — catalog reads need no login (crawlers, guests).
export const GetProductVariants = new Elysia().get(
  "/:productId/variants",
  async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductVariants(params.productId);
    return { success: true, data: result.map(publicVariant) };
  },
);

// Public — catalog reads need no login (crawlers, guests).
export const GetProductImages = new Elysia().get(
  "/:productId/images",
  async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductImages(params.productId);
    return { success: true, data: result.map(publicImage) };
  },
);

// Public — catalog reads need no login (crawlers, guests).
export const GetProductTags = new Elysia().get(
  "/:productId/tags",
  async (ctx) => {
    const { params } = ctx as any;
    const result = await getProductTags(params.productId);
    return { success: true, data: result.map(publicTag) };
  },
);

const PRODUCT_STATUSES = ["draft", "active", "suspended", "out_of_stock"];

// Admin — every listing (any store, any status), newest first.
export const GetManagedProducts = new Elysia()
  .use(adminPlugin)
  .get("/admin", async (ctx) => {
    const { query, set } = ctx as any;
    const status = query?.status;
    if (status && !PRODUCT_STATUSES.includes(status)) {
      set.status = 400;
      return { success: false, message: "Unknown product status." };
    }
    return paged(
      await getManagedProducts(pageParams(query), status),
      ownerListing,
    );
  });

// Admin — listings per status, for the catalogue tabs.
export const GetCatalogueCounts = new Elysia()
  .use(adminPlugin)
  .get("/admin/counts", async () => ({
    success: true,
    data: await getCatalogueCounts(),
  }));

// Admin — one listing with everything the edit page needs.
export const GetManagedProduct = new Elysia()
  .use(adminPlugin)
  .get("/admin/:productId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getManagedProduct(params.productId);
    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }
    return { success: true, data: ownerListing(result) };
  });

// Public — catalog reads need no login (crawlers, guests).
export const GetVariantDetails = new Elysia().get(
  "/variants/:variantId",
  async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getVariantDetails(params.variantId);
    if (result === "variant_not_found") {
      set.status = 404;
      return { success: false, message: "Product variant not found." };
    }
    return { success: true, data: publicVariantDetails(result) };
  },
);
