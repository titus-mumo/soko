import { getRepositories } from "../lib/repositories";
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
} = getRepositories();

// ─────────────────────────────────────────
// Products
// ─────────────────────────────────────────

export async function getProductBySlug(slug: string) {
  const product = await productRepository.findProductBySlug(slug);
  if (product === "product_not_found") return "product_not_found" as const;
  return product;
}

export async function getProductById(id: string) {
  const product = await productRepository.findProductById(id);
  if (product === "product_not_found") return "product_not_found" as const;
  return product;
}

export async function getProductsBySeller(sellerId: string) {
  return await productRepository.findProductsBySellerId(sellerId);
}

export async function getActiveProductsBySeller(sellerId: string) {
  return await productRepository.findActiveProductsBySellerId(sellerId);
}

export async function getProductsByCategory(categoryId: string) {
  return await productRepository.findActiveProductsByCategoryId(categoryId);
}

export async function createProduct(
  userId: string,
  data: {
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
  },
): Promise<
  | "seller_not_found"
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
  // Confirm the seller profile exists for this user.
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  // Confirm the category exists and is active.
  const category = await categoryRepository.findCategoryById(data.categoryId);
  if (category === "category_not_found") return "category_not_found";

  // Ensure slug is unique across all products.
  const existing = await productRepository.findProductBySlug(data.slug);
  if (existing !== "product_not_found") return "slug_taken";

  // A product must have at least one variant.
  if (!data.variants || data.variants.length === 0) return "no_variants";

  // Insert the product record first.
  const product = await productRepository.insertProduct({
    sellerId: seller.id,
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
  userId: string,
  productId: string,
  data: Partial<
    Pick<
      NewProduct,
      "name" | "slug" | "categoryId" | "description" | "condition"
    >
  >,
): Promise<
  | "seller_not_found"
  | "product_not_found"
  | "slug_taken"
  | Awaited<ReturnType<typeof productRepository.updateProduct>>
> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  if (data.slug) {
    const existing = await productRepository.findProductBySlug(data.slug);
    if (
      existing !== "product_not_found" &&
      (existing as any).id !== productId
    ) {
      return "slug_taken";
    }
  }

  return await productRepository.updateProduct(productId, seller.id, data);
}

export async function publishProduct(
  userId: string,
  productId: string,
): Promise<"seller_not_found" | "product_not_found" | "product_published"> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  const result = await productRepository.updateProductStatus(
    productId,
    seller.id,
    "active",
  );

  if (result === "product_not_found") return "product_not_found";

  return "product_published";
}

export async function unpublishProduct(
  userId: string,
  productId: string,
): Promise<"seller_not_found" | "product_not_found" | "product_unpublished"> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  const result = await productRepository.updateProductStatus(
    productId,
    seller.id,
    "draft",
  );

  if (result === "product_not_found") return "product_not_found";

  return "product_unpublished";
}

export async function deleteProduct(
  userId: string,
  productId: string,
): Promise<"seller_not_found" | "product_not_found" | "product_deleted"> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  // Cascade soft delete to variants, images, and tags.
  await productVariantRepository.softDeleteVariantsByProductId(productId);
  await productImageRepository.softDeleteImagesByProductId(productId);
  await productTagRepository.softDeleteTagsByProductId(productId);

  const result = await productRepository.softDeleteProduct(
    productId,
    seller.id,
  );
  if (!result) return "product_not_found";

  return "product_deleted";
}

// ─────────────────────────────────────────
// Variants
// ─────────────────────────────────────────

export async function getProductVariants(productId: string) {
  return await productVariantRepository.findVariantsByProductId(productId);
}

export async function addVariant(
  userId: string,
  productId: string,
  data: Omit<NewProductVariant, "productId">,
) {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found" as const;

  const product = await productRepository.findProductById(productId);
  if (product === "product_not_found") return "product_not_found" as const;

  return await productVariantRepository.insertVariant({
    productId,
    ...data,
  });
}

export async function updateVariant(
  userId: string,
  productId: string,
  variantId: string,
  data: Partial<NewProductVariant>,
) {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found" as const;

  return await productVariantRepository.updateVariant(
    variantId,
    productId,
    data,
  );
}

export async function adjustVariantStock(variantId: string, delta: number) {
  return await productVariantRepository.adjustStock(variantId, delta);
}

export async function deleteVariant(
  userId: string,
  productId: string,
  variantId: string,
) {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found" as const;

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
  return await productTagRepository.replaceProductTags(productId, tags);
}
