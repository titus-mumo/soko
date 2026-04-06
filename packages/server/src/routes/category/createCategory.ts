import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import { createCategory } from "../../services/category.service";

export const CreateCategory = new Elysia().use(adminPlugin).post(
  "/",
  async (ctx) => {
    const { body, set } = ctx as any;
    const result = await createCategory(body);

    if (result === "slug_taken") {
      set.status = 409;
      return { success: false, message: "Category slug is already taken." };
    }

    if (!result) {
      set.status = 500;
      return { success: false, message: "Failed to create category." };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      name: t.String({ minLength: 2 }),
      slug: t.String({ minLength: 2 }),
      icon: t.Optional(t.String()),
      parentId: t.Optional(t.String()),
    }),
  },
);
