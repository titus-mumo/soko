import { api } from "./api";
import type { ApiResponse, Category } from "./types";

export async function getRootCategories(): Promise<Category[]> {
  const { data } = await api.get<ApiResponse<Category[]>>("/categories");
  return data.data;
}

export async function getSubCategories(parentId: string): Promise<Category[]> {
  const { data } = await api.get<ApiResponse<Category[]>>(
    `/categories/sub/${parentId}`,
  );
  return data.data;
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const { data } = await api.get<ApiResponse<Category>>(`/categories/${slug}`);
  return data.data;
}
