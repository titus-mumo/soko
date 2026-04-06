import { getRepositories } from "../lib/repositories";
import type { NewCategory } from "db-operations";

const { categoryRepository } = getRepositories();

export async function getAllCategories() {
  return await categoryRepository.findAllCategories();
}

export async function getRootCategories() {
  return await categoryRepository.findRootCategories();
}

export async function getSubCategories(parentId: string) {
  return await categoryRepository.findSubCategories(parentId);
}

export async function getCategoryBySlug(slug: string) {
  const category = await categoryRepository.findCategoryBySlug(slug);
  if (category === "category_not_found") return "category_not_found" as const;
  return category;
}

export async function createCategory(
  data: Pick<NewCategory, "name" | "slug" | "icon" | "parentId">,
): Promise<
  "slug_taken" | Awaited<ReturnType<typeof categoryRepository.insertCategory>>
> {
  // Ensure slug is unique before inserting.
  const existing = await categoryRepository.findCategoryBySlug(data.slug);
  if (existing !== "category_not_found") return "slug_taken";

  const category = await categoryRepository.insertCategory({ ...data });
  return category;
}

export async function updateCategory(
  id: string,
  data: Partial<Pick<NewCategory, "name" | "slug" | "icon" | "parentId">>,
): Promise<
  | "category_not_found"
  | "slug_taken"
  | Awaited<ReturnType<typeof categoryRepository.updateCategory>>
> {
  if (data.slug) {
    const existing = await categoryRepository.findCategoryBySlug(data.slug);
    if (existing !== "category_not_found" && (existing as any).id !== id) {
      return "slug_taken";
    }
  }

  return await categoryRepository.updateCategory(id, data);
}

export async function deactivateCategory(id: string) {
  return await categoryRepository.deactivateCategory(id);
}

export async function activateCategory(id: string) {
  return await categoryRepository.activateCategory(id);
}

export async function deleteCategory(id: string) {
  return await categoryRepository.hardDeleteCategory(id);
}
