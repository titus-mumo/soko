import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import { addToCart } from "../../services/cart.service";

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

    if (result === "insufficient_stock") {
      set.status = 400;
      return { success: false, message: "Insufficient stock available." };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      productVariantId: t.String(),
      quantity: t.Optional(t.Number({ minimum: 1 })),
    }),
  },
);
