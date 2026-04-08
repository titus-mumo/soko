import { api } from "./api";
import type { Category, Product } from "./types";

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get("/categories");
  return data.data;
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const { data } = await api.get(`/categories/${slug}`);
  return data.data;
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  const { data } = await api.get(`/products/by-category/${categoryId}`);
  return data.data;
}
