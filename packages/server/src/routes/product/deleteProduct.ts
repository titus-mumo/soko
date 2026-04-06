import Elysia from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import { deleteProduct } from "../../services/product.service";

export const DeleteProduct = new Elysia()
  .use(sellerPlugin)
  .delete("/:productId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await deleteProduct(userId, params.productId);

    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    if (result === "product_not_found") {
      set.status = 404;
      return { success: false, message: "Product not found." };
    }

    return { success: true, message: "Product deleted successfully." };
  });
