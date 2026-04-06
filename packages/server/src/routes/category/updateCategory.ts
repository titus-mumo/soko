import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import { updateCategory } from "../../services/category.service";

export const UpdateCategory = new Elysia().use(adminPlugin).patch(
  "/:categoryId",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await updateCategory(params.categoryId, body);

    if (result === "category_not_found") {
      set.status = 404;
      return { success: false, message: "Category not found." };
    }

    if (result === "slug_taken") {
      set.status = 409;
      return { success: false, message: "Category slug is already taken." };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2 })),
      slug: t.Optional(t.String({ minLength: 2 })),
      icon: t.Optional(t.String()),
      parentId: t.Optional(t.String()),
    }),
  },
);
