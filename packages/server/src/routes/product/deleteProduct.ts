import Elysia from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import { deleteProduct } from "../../services/product.service";

export const DeleteProduct = new Elysia()
  .use(adminPlugin)
  .delete("/:productId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deleteProduct(params.productId);

    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product deleted successfully." };
  });
