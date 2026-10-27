import { getRepositories } from "../lib/repositories";
import type { CatalogueSort, PageParams, ProductStatus } from "db-operations";
import { anyContactInfo } from "../lib/contact-filter";
import { houseStoreId } from "../lib/house-store";
import type {
  NewProduct,
  NewProductVariant,
  NewProductImage,
  NewProductTag,
} from "db-operations";

const {
  productRepository,
  productVariantRepository,
  productImageRepository,
  productTagRepository,
  sellerProfileRepository,
  categoryRepository,
  notificationRepository,
  stockRepository,
  catalogueRepository,
  orderItemRepository,
} = getRepositories();

// ─────────────────────────────────────────
// Catalogue (public browsing)
// ─────────────────────────────────────────

/**
 * One page of the live catalogue, card-ready (price, image, availability in
 * the same query). `category` is a slug and includes its sub-categories.
 */
export async function browseCatalogue(params: {
  category?: string;
  q?: string;
  sort?: CatalogueSort;
  page?: PageParams;
}) {
  let categoryIds: string[] | undefined;
  if (params.category) {
    const category = await categoryRepository.findCategoryBySlug(
      params.category,
    );
    if (category === "category_not_found") return "category_not_found" as const;
    const subs = await categoryRepository.findSubCategories(category.id);
    categoryIds = [category.id, ...subs.map((c) => c.id)];
  }
  return await catalogueRepository.browse({
    categoryIds,
    q: params.q,
    sort: params.sort,
    ...params.page,
  });
}

/** Headline catalogue numbers (for e.g. the sign-in page). */
export async function getCatalogueStats() {
  return await catalogueRepository.stats();
}

// ─────────────────────────────────────────
// Products
// ─────────────────────────────────────────

export async function getProductBySlug(slug: string) {
  const product = await productRepository.findProductBySlug(slug);
  if (product === "product_not_found") return "product_not_found" as const;
  return product;
}

/**
 * A live listing for its public page, with the store's trust summary
 * (verified, rating, sales) — never which store it is. Drafts and
 * suspended listings are not found.
 */
export async function getPublicProductBySlug(slug: string) {
  const product = await productRepository.findProductBySlug(slug);
  if (product === "product_not_found" || product.status !== "active")
    return "product_not_found" as const;
  const seller = await sellerProfileRepository.findSellerProfileById(
    product.sellerId,
  );
  return { product, seller: typeof seller === "string" ? null : seller };
}

export async function getProductById(id: string) {
  const product = await productRepository.findProductById(id);
  if (product === "product_not_found") return "product_not_found" as const;
  return product;
}

export async function getProductsBySeller(sellerId: string) {
  return await productRepository.findProductsBySellerId(sellerId);
}

export async function getProductsByCategory(
  categoryId: string,
  page?: PageParams,
) {
  return await catalogueRepository.browse({
    categoryIds: [categoryId],
    ...page,
  });
}

// ─────────────────────────────────────────
// Catalogue management (admins)
// ─────────────────────────────────────────
// Soko manages the catalogue itself: admins create and edit every listing.
// Stores can't be created any more; existing listings keep their store, and
// new ones go to the house store (lib/house-store.ts).

/** Any listing (any status), with everything the edit page needs. */
export async function getManagedProduct(productId: string) {
  const product = await productRepository.findProductById(productId);
  if (product === "product_not_found") return "product_not_found" as const;
  const [variants, images, tags] = await Promise.all([
    productVariantRepository.findVariantsByProductId(productId),
    productImageRepository.findImagesByProductId(productId),
    productTagRepository.findTagsByProductId(productId),
  ]);
  return { ...product, variants, images, tags: tags.map((t) => t.tag) };
}

/**
 * One page of every listing, newest first, optionally at one status — each
 * with its variants, images and units sold (three batched queries).
 */
export async function getManagedProducts(
  page?: PageParams,
  status?: ProductStatus,
) {
  const result = await productRepository.pageProducts(page, status);
  const ids = result.items.map((p) => p.id);
  const [sold, variants, images] = await Promise.all([
    orderItemRepository.unitsSoldByProduct(ids),
    productVariantRepository.findVariantsByProductIds(ids),
    productImageRepository.findImagesByProductIds(ids),
  ]);
  return {
    ...result,
    items: result.items.map((p) => ({
      ...p,
      unitsSold: sold.get(p.id) ?? 0,
      variants: variants.filter((v) => v.productId === p.id),
      images: images.filter((i) => i.productId === p.id),
    })),
  };
}

/** Listings per status, for the admin catalogue tabs. */
export async function getCatalogueCounts() {
  return await productRepository.countByStatus();
}

// Resolves a variant to its product and primary image. Cart and order
// items only carry a variant id, so the client needs this to render them.
export async function getVariantDetails(variantId: string) {
  const variant = await productVariantRepository.findVariantById(variantId);
  if (variant === "variant_not_found") return "variant_not_found" as const;

  const product = await productRepository.findProductById(variant.productId);
  if (product === "product_not_found") return "variant_not_found" as const;

  const image = await productImageRepository.findPrimaryImage(product.id);
  const available = await stockRepository.availableQuantities([variant.id]);

  return {
    variant: { ...variant, availableQuantity: available.get(variant.id) ?? 0 },
    product,
    primaryImage: image === "image_not_found" ? null : image,
  };
}

export async function createProduct(data: {
  name: string;
  slug: string;
  categoryId: string;
  description?: string;
  condition: "new" | "used" | "refurbished";
  variants: Array<{
    sku: string;
    size?: string;
    color?: string;
    material?: string;
    price: string;
    compareAtPrice?: string;
    stockQuantity?: number;
  }>;
  images?: Array<{
    url: string;
    isPrimary?: boolean;
    sortOrder?: number;
    variantId?: string;
  }>;
  tags?: string[];
}): Promise<
  | "contact_info"
  | "category_not_found"
  | "slug_taken"
  | "no_variants"
  | {
      product: NonNullable<
        Awaited<ReturnType<typeof productRepository.insertProduct>>
      >;
      variants: Awaited<
        ReturnType<typeof productVariantRepository.insertVariants>
      >;
      images: Awaited<ReturnType<typeof productImageRepository.insertImages>>;
      tags: Awaited<ReturnType<typeof productTagRepository.insertTags>>;
    }
> {
  // Listings can't carry ways to reach the seller off Soko.
  if (
    anyContactInfo(
      data.name,
      data.description,
      ...(data.tags ?? []),
      ...data.variants.flatMap((v) => [v.size, v.color, v.material]),
    )
  )
    return "contact_info";

  // Confirm the category exists and is active.
  const category = await categoryRepository.findCategoryById(data.categoryId);
  if (category === "category_not_found") return "category_not_found";

  // Ensure slug is unique across all products.
  const existing = await productRepository.findProductBySlug(data.slug);
  if (existing !== "product_not_found") return "slug_taken";

  // A product must have at least one variant.
  if (!data.variants || data.variants.length === 0) return "no_variants";

  // Insert the product record first, under Soko's own store.
  const product = await productRepository.insertProduct({
    sellerId: await houseStoreId(),
    categoryId: data.categoryId,
    name: data.name,
    slug: data.slug,
    description: data.description,
    condition: data.condition,
    status: "draft", // all products start as drafts
  });

  if (!product) throw new Error("Failed to create product");

  // Insert all variants in one round trip.
  const variants = await productVariantRepository.insertVariants(
    data.variants.map((v) => ({
      productId: product.id,
      ...v,
    })),
  );

  // Insert images if provided.
  const images = data.images
    ? await productImageRepository.insertImages(
        data.images.map((img, index) => ({
          productId: product.id,
          url: img.url,
          isPrimary: img.isPrimary ?? index === 0, // first image is primary by default
          sortOrder: img.sortOrder ?? index,
          variantId: img.variantId ?? null,
        })),
      )
    : [];

  // Insert tags if provided.
  const tags = data.tags
    ? await productTagRepository.insertTags(
        data.tags.map((tag) => ({ productId: product.id, tag })),
      )
    : [];

  return { product, variants, images, tags };
}

export async function updateProduct(
  productId: string,
  data: Partial<
    Pick<
      NewProduct,
      "name" | "slug" | "categoryId" | "description" | "condition"
    >
  >,
): Promise<
  | "product_not_found"
  | "slug_taken"
  | "contact_info"
  | Awaited<ReturnType<typeof productRepository.updateProduct>>
> {
  const product = await productRepository.findProductById(productId);
  if (product === "product_not_found") return "product_not_found";

  if (anyContactInfo(data.name, data.description)) return "contact_info";

  if (data.slug) {
    const existing = await productRepository.findProductBySlug(data.slug);
    if (existing !== "product_not_found" && existing.id !== productId)
      return "slug_taken";
  }

  return await productRepository.updateProduct(
    productId,
    product.sellerId,
    data,
  );
}

async function setStatus(productId: string, status: "active" | "draft") {
  const product = await productRepository.findProductById(productId);
  if (product === "product_not_found") return "product_not_found" as const;
  return await productRepository.updateProductStatus(
    productId,
    product.sellerId,
    status,
  );
}

export async function publishProduct(
  productId: string,
): Promise<"product_not_found" | "product_published"> {
  const result = await setStatus(productId, "active");
  return result === "product_not_found" ? result : "product_published";
}

export async function unpublishProduct(
  productId: string,
): Promise<"product_not_found" | "product_unpublished"> {
  const result = await setStatus(productId, "draft");
  return result === "product_not_found" ? result : "product_unpublished";
}

export async function deleteProduct(
  productId: string,
): Promise<"product_not_found" | "product_deleted"> {
  const product = await productRepository.findProductById(productId);
  if (product === "product_not_found") return "product_not_found";

  // Cascade soft delete to variants, images, and tags.
  await productVariantRepository.softDeleteVariantsByProductId(productId);
  await productImageRepository.softDeleteImagesByProductId(productId);
  await productTagRepository.softDeleteTagsByProductId(productId);

  const result = await productRepository.softDeleteProduct(
    productId,
    product.sellerId,
  );
  if (!result) return "product_not_found";

  return "product_deleted";
}

// ─────────────────────────────────────────
// Variants
// ─────────────────────────────────────────

/**
 * A product's variants, each with `availableQuantity`: stock minus what's
 * held in shoppers' carts. That's what buyers can actually still add.
 */
export async function getProductVariants(productId: string) {
  const variants =
    await productVariantRepository.findVariantsByProductId(productId);
  const available = await stockRepository.availableQuantities(
    variants.map((v) => v.id),
  );
  return variants.map((v) => ({
    ...v,
    availableQuantity: available.get(v.id) ?? 0,
  }));
}

export async function addVariant(
  productId: string,
  data: Omit<NewProductVariant, "productId">,
) {
  const product = await productRepository.findProductById(productId);
  if (product === "product_not_found") return "product_not_found" as const;

  return await productVariantRepository.insertVariant({
    productId,
    ...data,
  });
}

export async function updateVariant(
  productId: string,
  variantId: string,
  data: Partial<NewProductVariant>,
) {
  return await productVariantRepository.updateVariant(
    variantId,
    productId,
    data,
  );
}

export async function adjustVariantStock(variantId: string, delta: number) {
  return await productVariantRepository.adjustStock(variantId, delta);
}

export async function deleteVariant(productId: string, variantId: string) {
  return await productVariantRepository.softDeleteVariant(variantId, productId);
}

// ─────────────────────────────────────────
// Images
// ─────────────────────────────────────────

export async function getProductImages(productId: string) {
  return await productImageRepository.findImagesByProductId(productId);
}

export async function addProductImage(
  productId: string,
  data: Omit<NewProductImage, "productId">,
) {
  return await productImageRepository.insertImage({ productId, ...data });
}

export async function setPrimaryImage(productId: string, imageId: string) {
  return await productImageRepository.setPrimaryImage(imageId, productId);
}

export async function deleteProductImage(productId: string, imageId: string) {
  return await productImageRepository.softDeleteImage(imageId, productId);
}

// ─────────────────────────────────────────
// Tags
// ─────────────────────────────────────────

export async function getProductTags(productId: string) {
  return await productTagRepository.findTagsByProductId(productId);
}

export async function replaceProductTags(productId: string, tags: string[]) {
  const product = await productRepository.findProductById(productId);
  if (product === "product_not_found") return "product_not_found" as const;
  if (anyContactInfo(...tags)) return "contact_info" as const;
  return await productTagRepository.replaceProductTags(productId, tags);
}
