import { api } from "./api";
import type { Product } from "./types";

export interface CreateProductPayload {
  name: string;
  slug: string;
  categoryId: string;
  description?: string;
  condition: "new" | "used" | "refurbished";
  variants: {
    sku: string;
    price: string;
    stockQuantity?: number;
    size?: string;
    color?: string;
    material?: string;
  }[];
  tags?: string[];
}

export type UpdateProductPayload = Partial<
  Pick<
    CreateProductPayload,
    "name" | "slug" | "categoryId" | "description" | "condition"
  >
>;

export async function getProductBySlug(slug: string): Promise<Product> {
  const { data } = await api.get(`/products/by-slug/${slug}`);
  return data.data;
}

export async function getProductsBySeller(
  sellerId: string,
): Promise<Product[]> {
  const { data } = await api.get(`/products/by-seller/${sellerId}`);
  return data.data;
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  const { data } = await api.post("/products", payload);
  return data.data;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const { data } = await api.patch(`/products/${id}`, payload);
  return data.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function publishProduct(id: string): Promise<void> {
  await api.patch(`/products/${id}/publish`);
}

export async function unpublishProduct(id: string): Promise<void> {
  await api.patch(`/products/${id}/unpublish`);
}
