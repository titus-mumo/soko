import Elysia from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import { getCartItems, getCartSummary } from "../../services/cart.service";
import { cartItem } from "../../lib/views";

export const GetCartItems = new Elysia()
  .use(authPlugin)
  .get("/", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getCartItems(userId);
    return { success: true, data: result.map(cartItem) };
  });

export const GetCartSummary = new Elysia()
  .use(authPlugin)
  .get("/summary", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getCartSummary(userId);

    // No cart yet (a new shopper, or an admin browsing the shop) is just
    // an empty one — not an error for every page to log.
    if (result === "cart_not_found")
      return {
        success: true,
        data: { items: [], itemCount: 0, subtotal: "0.00" },
      };

    return {
      success: true,
      data: { ...result, items: result.items.map(cartItem) },
    };
  });
