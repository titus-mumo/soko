import Elysia, { t } from "elysia";
import { stockMessage } from "../../lib/stock";
import { authPlugin } from "../../middleware/auth.middleware";
import { addToCart } from "../../services/cart.service";
import { cartItem, shownStock } from "../../lib/views";

export const AddToCart = new Elysia().use(authPlugin).post(
  "/",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await addToCart(
      userId,
      body.productVariantId,
      body.quantity,
    );

    if (result === "variant_not_found") {
      set.status = 404;
      return { success: false, message: "Product variant not found." };
    }

    if (result === "own_listing") {
      set.status = 403;
      return {
        success: false,
        message: "You can't buy from your own store.",
      };
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

    set.status = 201;
    return { success: true, data: cartItem(result) };
  },
  {
    body: t.Object({
      productVariantId: t.String(),
      quantity: t.Optional(t.Number({ minimum: 1 })),
    }),
  },
);
