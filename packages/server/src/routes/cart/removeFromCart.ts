import Elysia from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import { removeCartItem, clearCart } from "../../services/cart.service";

export const RemoveCartItem = new Elysia()
  .use(authPlugin)
  .delete("/:cartItemId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await removeCartItem(userId, params.cartItemId);

    if (result === "cart_not_found") {
      set.status = 404;
      return { success: false, message: "Cart not found." };
    }

    if (result === "cart_item_not_found") {
      set.status = 404;
      return { success: false, message: "Cart item not found." };
    }

    return { success: true, message: "Item removed from cart." };
  });

export const ClearCart = new Elysia()
  .use(authPlugin)
  .delete("/", async (ctx) => {
    const { userId, set } = ctx as any;
    const result = await clearCart(userId);

    if (result === "cart_not_found") {
      set.status = 404;
      return { success: false, message: "Cart not found." };
    }

    return { success: true, message: "Cart cleared successfully." };
  });
