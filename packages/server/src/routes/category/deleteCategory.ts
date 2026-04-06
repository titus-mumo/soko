import Elysia from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import { deleteCategory } from "../../services/category.service";

export const DeleteCategory = new Elysia()
  .use(adminPlugin)
  .delete("/:categoryId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deleteCategory(params.categoryId);

    if (!result) {
      set.status = 404;
      return { success: false, message: "Category not found." };
    }

    return { success: true, message: "Category deleted successfully." };
  });
