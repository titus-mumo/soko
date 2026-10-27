import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  addProductImage,
  setPrimaryImage,
  deleteProductImage,
} from "../../services/product.service";

export const AddProductImage = new Elysia().use(adminPlugin).post(
  "/:productId/images",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await addProductImage(params.productId, body);

    if (!result) {
      set.status = 500;
      return { success: false, message: "Failed to add image." };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      url: t.String(),
      isPrimary: t.Optional(t.Boolean()),
      sortOrder: t.Optional(t.Number()),
      variantId: t.Optional(t.String()),
    }),
  },
);

export const SetPrimaryImage = new Elysia()
  .use(adminPlugin)
  .patch("/:productId/images/:imageId/primary", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await setPrimaryImage(params.productId, params.imageId);

    if (result === "image_not_found") {
      set.status = 404;
      return { success: false, message: "Image not found." };
    }

    return { success: true, data: result };
  });

export const DeleteProductImage = new Elysia()
  .use(adminPlugin)
  .delete("/:productId/images/:imageId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deleteProductImage(params.productId, params.imageId);

    if (!result) {
      set.status = 404;
      return { success: false, message: "Image not found." };
    }

    return { success: true, message: "Image deleted successfully." };
  });
