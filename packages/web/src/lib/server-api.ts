import type { Paged } from "./paging";
import type {
  ApiResponse,
  CatalogueItem,
  CatalogueSort,
  Category,
  DeliveryZone,
  PublicProduct,
  ProductImage,
  ProductTag,
  ProductVariant,
  Review,
  PublicSeller,
} from "./types";
import { API_URL } from "./env";

// Server-side reads of public catalog data, for metadata, structured data and
// first render. Import only from server components — the browser keeps using
// the axios client in ./api.

const REVALIDATE_SECONDS = 60;

// This server renders pages for every visitor, so the API would otherwise
// rate-limit all of them as one client. The key is server-only (no
// NEXT_PUBLIC_ prefix): it's undefined in browser bundles.
const INTERNAL_HEADERS: Record<string, string> = process.env.INTERNAL_API_KEY
  ? { "x-internal-key": process.env.INTERNAL_API_KEY }
  : {};

/** GET a public endpoint. Returns null on 404 or when the API is unreachable. */
async function getPublic<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: INTERNAL_HEADERS,
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResponse<T>;
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

export interface ProductPageData {
  product: PublicProduct;
  variants: ProductVariant[];
  images: ProductImage[];
  tags: string[];
  category: Category | null;
  seller: PublicSeller | null;
  rating: { average: number; count: number };
}

export async function fetchProductPage(
  slug: string,
): Promise<ProductPageData | null> {
  // Only live listings are found (drafts and suspended ones are 404s).
  const product = await getPublic<PublicProduct>(
    `/products/by-slug/${encodeURIComponent(slug)}`,
  );
  if (!product) return null;

  const [variants, images, tags, reviews, avg, category] = await Promise.all([
    getPublic<ProductVariant[]>(`/products/${product.id}/variants`),
    getPublic<ProductImage[]>(`/products/${product.id}/images`),
    getPublic<ProductTag[]>(`/products/${product.id}/tags`),
    getPublic<Review[]>(`/reviews/product/${product.id}`),
    getPublic<{ averageRating: number | string | null }>(
      `/reviews/product/${product.id}/rating`,
    ),
    findCategoryById(product.categoryId),
  ]);

  const sortedImages = [...(images ?? [])].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder,
  );

  return {
    product,
    variants: variants ?? [],
    images: sortedImages,
    tags: (tags ?? []).map((t) => t.tag),
    category,
    seller: product.seller,
    rating: {
      average: Number(avg?.averageRating ?? 0),
      count: reviews?.length ?? 0,
    },
  };
}

/**
 * Just the product, if it's publicly visible. A cheap existence check for
 * the segment layout (same cached request as fetchProductPage's first call).
 */
export async function fetchPublicProduct(
  slug: string,
): Promise<PublicProduct | null> {
  return getPublic<PublicProduct>(
    `/products/by-slug/${encodeURIComponent(slug)}`,
  );
}

export async function fetchCategory(slug: string): Promise<Category | null> {
  return getPublic<Category>(`/categories/${encodeURIComponent(slug)}`);
}

export async function fetchRootCategories(): Promise<Category[]> {
  return (await getPublic<Category[]>("/categories")) ?? [];
}

export async function fetchSubCategories(
  parentId: string,
): Promise<Category[]> {
  return (await getPublic<Category[]>(`/categories/sub/${parentId}`)) ?? [];
}

/**
 * One page of the live catalogue, card-ready (one request, no per-product
 * follow-ups). `category` is a slug and includes its sub-categories.
 */
export async function fetchCatalogue(params: {
  category?: string;
  q?: string;
  sort?: CatalogueSort;
  limit?: number;
  cursor?: string | null;
}): Promise<Paged<CatalogueItem>> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  try {
    const res = await fetch(`${API_URL}/products?${qs}`, {
      headers: INTERNAL_HEADERS,
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return { items: [], nextCursor: null };
    const body = (await res.json()) as ApiResponse<CatalogueItem[]> & {
      nextCursor?: string | null;
      total?: number;
    };
    return {
      items: body.data ?? [],
      nextCursor: body.nextCursor ?? null,
      total: body.total,
    };
  } catch {
    return { items: [], nextCursor: null };
  }
}

/**
 * There's no category-by-id endpoint, so walk roots and their children.
 * Category trees are small and these calls are cached.
 */
async function findCategoryById(id: string): Promise<Category | null> {
  const roots = await fetchRootCategories();
  const root = roots.find((c) => c.id === id);
  if (root) return root;
  for (const r of roots) {
    const child = (await fetchSubCategories(r.id)).find((c) => c.id === id);
    if (child) return child;
  }
  return null;
}

export interface HomeData {
  categories: Category[];
  products: CatalogueItem[];
  counties: number;
}

/**
 * Everything the home page shows, or null when the API doesn't answer
 * within `timeoutMs` (asleep on Render, waking up, or down) — the page then
 * renders its saved snapshot instead of making the visitor wait.
 */
export async function fetchHomeData(
  timeoutMs: number,
): Promise<HomeData | null> {
  const signal = AbortSignal.timeout(timeoutMs);
  const live = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${API_URL}${path}`, {
      headers: INTERNAL_HEADERS,
      signal,
      next: { revalidate: REVALIDATE_SECONDS },
    });
    const body = (await res.json()) as ApiResponse<T>;
    if (!res.ok || !body.success) throw new Error(`${path}: ${res.status}`);
    return body.data;
  };
  try {
    const [categories, products, zones] = await Promise.all([
      live<Category[]>("/categories"),
      live<CatalogueItem[]>("/products?limit=8"),
      live<DeliveryZone[]>("/delivery/zones"),
    ]);
    return {
      categories,
      products,
      counties: new Set(zones.map((z) => z.county.trim().toLowerCase())).size,
    };
  } catch {
    return null;
  }
}

export async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  return (await getPublic<DeliveryZone[]>("/delivery/zones")) ?? [];
}

export interface MarketStats {
  products: number;
  sellers: number;
  counties: number;
}

/**
 * Real marketplace numbers for the auth pages' social proof (counted by the
 * API, not by downloading the catalogue). Null if the API is unreachable —
 * callers should then hide the stats rather than show made-up ones.
 */
export async function fetchMarketStats(): Promise<MarketStats | null> {
  const [counts, zones] = await Promise.all([
    getPublic<{ products: number; sellers: number }>("/products/stats"),
    getPublic<{ county: string }[]>("/delivery/zones"),
  ]);
  if (!counts || !zones) return null;
  return {
    products: counts.products,
    sellers: counts.sellers,
    counties: new Set(zones.map((z) => z.county.trim().toLowerCase())).size,
  };
}

/** Category trail from root to `category`, for breadcrumbs. */
export async function categoryTrail(category: Category): Promise<Category[]> {
  if (!category.parentId) return [category];
  const parent = (await fetchRootCategories()).find(
    (c) => c.id === category.parentId,
  );
  return parent ? [parent, category] : [category];
}
