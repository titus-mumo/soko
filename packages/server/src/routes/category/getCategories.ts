import Elysia from "elysia";
import {
  getRootCategories,
  getAllCategories,
  getSubCategories,
  getCategoryBySlug,
} from "../../services/category.service";
import { adminPlugin, authPlugin } from "../../middleware/auth.middleware";

export const GetRootCategories = new Elysia()
  .use(authPlugin)
  .get("/", async () => {
    const result = await getRootCategories();
    return { success: true, data: result };
  });

export const GetAllCategories = new Elysia()
  .use(authPlugin)
  .use(adminPlugin)
  .get("/all", async () => {
    const result = await getAllCategories();
    return { success: true, data: result };
  });

export const GetSubCategories = new Elysia()
  .use(authPlugin)
  .get("/sub/:parentId", async (ctx) => {
    const { params } = ctx as any;
    const result = await getSubCategories(params.parentId);
    return { success: true, data: result };
  });

export const GetCategoryBySlug = new Elysia()
  .use(authPlugin)
  .get("/:slug", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getCategoryBySlug(params.slug);

    if (result === "category_not_found") {
      set.status = 404;
      return { success: false, message: "Category not found." };
    }

    return { success: true, data: result };
  });
