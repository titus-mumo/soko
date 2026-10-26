import Elysia, { t } from "elysia";
import { stockMessage } from "../../lib/stock";
import { authPlugin } from "../../middleware/auth.middleware";
import {
  updateCartItemQuantity,
  incrementCartItem,
} from "../../services/cart.service";
import { shownStock } from "../../lib/views";

export const UpdateCartItemQuantity = new Elysia().use(authPlugin).patch(
  "/:cartItemId/quantity",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await updateCartItemQuantity(
      userId,
      params.cartItemId,
      body.quantity,
    );

    if (result === "cart_not_found") {
      set.status = 404;
      return { success: false, message: "Cart not found." };
    }

    if (result === "cart_item_not_found") {
      set.status = 404;
      return { success: false, message: "Cart item not found." };
    }

    if (typeof result === "object" && result && "insufficientStock" in result) {
      set.status = 400;
      return {
        success: false,
        code: "INSUFFICIENT_STOCK",
        available: shownStock(result.available),
        inCart: result.inCart,
        message: stockMessage(result.available, result.inCart),
      };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      quantity: t.Number({ minimum: 0 }),
    }),
  },
);

export const AdjustCartItemQuantity = new Elysia().use(authPlugin).patch(
  "/:cartItemId/adjust",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await incrementCartItem(
      userId,
      params.cartItemId,
      body.delta,
    );

    if (result === "cart_not_found") {
      set.status = 404;
      return { success: false, message: "Cart not found." };
    }

    if (result === "cart_item_not_found") {
      set.status = 404;
      return { success: false, message: "Cart item not found." };
    }

    if (typeof result === "object" && result && "insufficientStock" in result) {
      set.status = 400;
      return {
        success: false,
        code: "INSUFFICIENT_STOCK",
        available: shownStock(result.available),
        inCart: result.inCart,
        message: stockMessage(result.available, result.inCart),
      };
    }

    return { success: true, data: result };
  },
  {
    body: t.Object({
      delta: t.Number(),
    }),
  },
);
