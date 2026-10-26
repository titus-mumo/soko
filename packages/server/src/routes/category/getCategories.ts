import Elysia from "elysia";
import {
  getRootCategories,
  getAllCategories,
  getSubCategories,
  getCategoryBySlug,
} from "../../services/category.service";
import { adminPlugin } from "../../middleware/auth.middleware";
import { publicCategory } from "../../lib/views";

// Public
export const GetRootCategories = new Elysia().get("/", async () => {
  const result = await getRootCategories();
  return { success: true, data: result.map(publicCategory) };
});

export const GetAllCategories = new Elysia()
  .use(adminPlugin)
  .get("/all", async () => {
    const result = await getAllCategories();
    return { success: true, data: result };
  });

// Public
export const GetSubCategories = new Elysia().get(
  "/sub/:parentId",
  async (ctx) => {
    const { params } = ctx as any;
    const result = await getSubCategories(params.parentId);
    return { success: true, data: result.map(publicCategory) };
  },
);

// Public
export const GetCategoryBySlug = new Elysia().get("/:slug", async (ctx) => {
  const { params, set } = ctx as any;
  const result = await getCategoryBySlug(params.slug);

  if (result === "category_not_found") {
    set.status = 404;
    return { success: false, message: "Category not found." };
  }

  return { success: true, data: publicCategory(result) };
});
