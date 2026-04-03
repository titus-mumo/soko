import { db } from "src/db";
import { categoriesTable } from "src/schema";
import { eq, isNull, and } from "drizzle-orm";

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type FindCategoryResponse = Category | "category_not_found";

export class CategoryRepository {
  async insertCategory(category: NewCategory): Promise<Category | null> {
    const [res] = await db.insert(categoriesTable).values(category).returning();

    return res ?? null;
  }

  async findCategoryById(id: string): Promise<FindCategoryResponse> {
    const [res] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id));

    if (!res) return "category_not_found";

    return res;
  }

  async findCategoryBySlug(slug: string): Promise<FindCategoryResponse> {
    const [res] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug));

    if (!res) return "category_not_found";

    return res;
  }

  // Returns only top-level categories (no parent).
  // Use this for rendering the main navigation or category listing pages.
  async findRootCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categoriesTable)
      .where(
        and(
          isNull(categoriesTable.parentId),
          eq(categoriesTable.isActive, true),
        ),
      );
  }

  // Returns all direct children of a given parent category.
  // Use this for rendering sub-category menus or drill-down navigation.
  async findSubCategories(parentId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.parentId, parentId),
          eq(categoriesTable.isActive, true),
        ),
      );
  }

  // Returns all categories regardless of hierarchy or active state.
  // Intended for admin dashboards where full visibility is needed.
  async findAllCategories(): Promise<Category[]> {
    return await db.select().from(categoriesTable);
  }

  async updateCategory(
    id: string,
    data: Partial<NewCategory>,
  ): Promise<FindCategoryResponse> {
    const [res] = await db
      .update(categoriesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!res) return "category_not_found";

    return res;
  }

  // Deactivates a category without deleting it.
  // Prefer this over hard delete to preserve product associations and history.
  async deactivateCategory(id: string): Promise<FindCategoryResponse> {
    const [res] = await db
      .update(categoriesTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!res) return "category_not_found";

    return res;
  }

  // Re-activates a previously deactivated category.
  async activateCategory(id: string): Promise<FindCategoryResponse> {
    const [res] = await db
      .update(categoriesTable)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!res) return "category_not_found";

    return res;
  }

  // Permanently removes a category. Only use when no products reference this category.
  // For most cases, prefer deactivateCategory to avoid breaking product associations.
  async hardDeleteCategory(id: string): Promise<boolean> {
    const res = await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .returning();

    return res.length > 0;
  }
}
