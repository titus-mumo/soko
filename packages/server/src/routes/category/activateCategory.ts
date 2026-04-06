import Elysia from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import { activateCategory } from "../../services/category.service";

export const ActivateCategory = new Elysia()
  .use(adminPlugin)
  .patch("/:categoryId/activate", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await activateCategory(params.categoryId);

    if (result === "category_not_found") {
      set.status = 404;
      return { success: false, message: "Category not found." };
    }

    return { success: true, message: "Category activated successfully." };
  });
