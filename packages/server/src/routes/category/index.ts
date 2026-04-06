import Elysia from "elysia";
import { CreateCategory } from "./createCategory";
import {
  GetRootCategories,
  GetAllCategories,
  GetSubCategories,
  GetCategoryBySlug,
} from "./getCategories";
import { UpdateCategory } from "./updateCategory";
import { DeactivateCategory } from "./deactivateCategory";
import { ActivateCategory } from "./activateCategory";
import { DeleteCategory } from "./deleteCategory";

export const categoryRoutes = new Elysia().group("/categories", (app) =>
  app
    .use(GetRootCategories)
    .use(GetAllCategories)
    .use(GetSubCategories)
    .use(GetCategoryBySlug)
    .use(CreateCategory)
    .use(UpdateCategory)
    .use(DeactivateCategory)
    .use(ActivateCategory)
    .use(DeleteCategory)
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return { success: false, message: error.message };
      }
      if (code === "INTERNAL_SERVER_ERROR") {
        set.status = 500;
        return { success: false, message: "Internal server error." };
      }
    }),
);
