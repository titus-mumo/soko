import { api } from "./api";
import { getPage, type Paged, type PageRequest } from "./paging";
import type {
  ApiResponse,
  CatalogueItem,
  CatalogueSort,
  Product,
  ProductCondition,
  ProductImage,
  ProductTag,
  ProductVariant,
  ProductWithMedia,
  VariantDetails,
} from "./types";

export interface VariantPayload {
  sku: string;
  price: string;
  compareAtPrice?: string;
  stockQuantity?: number;
  size?: string;
  color?: string;
  material?: string;
}

export interface CreateProductPayload {
  name: string;
  slug: string;
  categoryId: string;
  description?: string;
  condition: ProductCondition;
  variants: VariantPayload[];
  images?: { url: string; isPrimary?: boolean; sortOrder?: number }[];
  tags?: string[];
}

export interface CreatedProduct {
  product: Product;
  variants: ProductVariant[];
  images: ProductImage[];
  tags: ProductTag[];
}

export type UpdateProductPayload = Partial<
  Pick<
    CreateProductPayload,
    "name" | "slug" | "categoryId" | "description" | "condition"
  >
>;

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getProductBySlug(slug: string): Promise<Product> {
  const { data } = await api.get<ApiResponse<Product>>(
    `/products/by-slug/${slug}`,
  );
  return data.data;
}

/** All of the signed-in seller's products, drafts included. */
export type MyProduct = ProductWithMedia & { unitsSold: number };

export type MyListing = ProductWithMedia & { tags: string[] };

/**
 * One of the seller's own listings, any status, with everything the edit
 * page needs — SKUs and real stock included (404 if it isn't theirs).
 */
export async function getMyProduct(id: string): Promise<MyListing> {
  const { data } = await api.get<ApiResponse<MyListing>>(`/products/me/${id}`);
  return data.data;
}

/**
 * One page of the seller's own listings (any status), each with its variants,
 * images and units sold.
 */
export function getMyProducts(page?: PageRequest): Promise<Paged<MyProduct>> {
  return getPage<MyProduct>("/products/me", page);
}

export async function getVariantDetails(
  variantId: string,
): Promise<VariantDetails> {
  const { data } = await api.get<ApiResponse<VariantDetails>>(
    `/products/variants/${variantId}`,
  );
  return data.data;
}

/**
 * One page of the live catalogue, card-ready. `category` is a slug and
 * includes its sub-categories.
 */
export function browseProducts(
  filters: { category?: string; q?: string; sort?: CatalogueSort },
  page?: PageRequest,
): Promise<Paged<CatalogueItem>> {
  return getPage<CatalogueItem>("/products", page, {
    category: filters.category,
    q: filters.q?.trim() || undefined,
    sort: filters.sort,
  });
}

/** Resolves many variant ids at once, skipping any that fail. */
export async function getVariantDetailsMap(
  variantIds: string[],
): Promise<Record<string, VariantDetails>> {
  const unique = [...new Set(variantIds)];
  const entries = await Promise.all(
    unique.map((id) =>
      getVariantDetails(id)
        .then((d) => [id, d] as const)
        .catch(() => null),
    ),
  );
  return Object.fromEntries(entries.filter((e) => e !== null));
}

// ─── Product management ──────────────────────────────────────────────────────

export async function createProduct(
  payload: CreateProductPayload,
): Promise<CreatedProduct> {
  const { data } = await api.post<ApiResponse<CreatedProduct>>(
    "/products",
    payload,
  );
  return data.data;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const { data } = await api.patch<ApiResponse<Product>>(
    `/products/${id}`,
    payload,
  );
  return data.data;
}

export async function publishProduct(id: string): Promise<void> {
  await api.patch(`/products/${id}/publish`);
}

export async function unpublishProduct(id: string): Promise<void> {
  await api.patch(`/products/${id}/unpublish`);
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

// ─── Variants ────────────────────────────────────────────────────────────────

export async function addVariant(
  productId: string,
  payload: VariantPayload,
): Promise<ProductVariant> {
  const { data } = await api.post<ApiResponse<ProductVariant>>(
    `/products/${productId}/variants`,
    payload,
  );
  return data.data;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  payload: Partial<VariantPayload>,
): Promise<ProductVariant> {
  const { data } = await api.patch<ApiResponse<ProductVariant>>(
    `/products/${productId}/variants/${variantId}`,
    payload,
  );
  return data.data;
}

export async function adjustVariantStock(
  productId: string,
  variantId: string,
  delta: number,
): Promise<ProductVariant> {
  const { data } = await api.patch<ApiResponse<ProductVariant>>(
    `/products/${productId}/variants/${variantId}/stock`,
    { delta },
  );
  return data.data;
}

export async function deleteVariant(
  productId: string,
  variantId: string,
): Promise<void> {
  await api.delete(`/products/${productId}/variants/${variantId}`);
}

// ─── Images ──────────────────────────────────────────────────────────────────

export async function addProductImage(
  productId: string,
  payload: {
    url: string;
    isPrimary?: boolean;
    sortOrder?: number;
    variantId?: string;
  },
): Promise<ProductImage> {
  const { data } = await api.post<ApiResponse<ProductImage>>(
    `/products/${productId}/images`,
    payload,
  );
  return data.data;
}

export async function setPrimaryImage(
  productId: string,
  imageId: string,
): Promise<void> {
  await api.patch(`/products/${productId}/images/${imageId}/primary`);
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
): Promise<void> {
  await api.delete(`/products/${productId}/images/${imageId}`);
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function replaceProductTags(
  productId: string,
  tags: string[],
): Promise<void> {
  await api.put(`/products/${productId}/tags`, { tags });
}
