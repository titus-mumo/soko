import Elysia from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import { deactivateCategory } from "../../services/category.service";

export const DeactivateCategory = new Elysia()
  .use(adminPlugin)
  .patch("/:categoryId/deactivate", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deactivateCategory(params.categoryId);

    if (result === "category_not_found") {
      set.status = 404;
      return { success: false, message: "Category not found." };
    }

    return { success: true, message: "Category deactivated successfully." };
  });
