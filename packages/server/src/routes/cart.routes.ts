import Elysia, { t } from "elysia";
import { authPlugin } from "src/middleware/auth.middleware";
import {
  getCartItems,
  getCartSummary,
  addToCart,
  updateCartItemQuantity,
  incrementCartItem,
  removeCartItem,
  clearCart,
} from "../services/cart.service";

export const cartRoutes = new Elysia({ prefix: "/cart" }).group("/", (app) =>
  app
    .use(authPlugin)

    // Get all items in the current user's cart.
    .get("/", async (ctx) => {
      const { userId } = ctx as any;
      const result = await getCartItems(userId);
      return { success: true, data: result };
    })

    // Get cart summary with itemCount and subtotal.
    // Use this at checkout to show the order summary.
    .get("/summary", async (ctx) => {
      const { userId } = ctx as any;
      const result = await getCartSummary(userId);

      if (result === "cart_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Cart not found." };
      }

      return { success: true, data: result };
    })

    // Add a variant to the cart.
    // If the variant already exists in the cart, increments quantity instead.
    .post(
      "/",
      async (ctx) => {
        const { userId, body } = ctx as any;
        const result = await addToCart(
          userId,
          body.productVariantId,
          body.quantity,
        );

        if (result === "variant_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Product variant not found." };
        }

        if (result === "insufficient_stock") {
          ctx.set.status = 400;
          return { success: false, message: "Insufficient stock available." };
        }

        ctx.set.status = 201;
        return { success: true, data: result };
      },
      {
        body: t.Object({
          productVariantId: t.String(),
          quantity: t.Optional(t.Number({ minimum: 1 })),
        }),
      },
    )

    // Hard-set the quantity for a cart item.
    // Use this when the buyer types an exact quantity in the cart UI.
    .patch(
      "/:cartItemId/quantity",
      async (ctx) => {
        const { userId, params, body } = ctx as any;
        const result = await updateCartItemQuantity(
          userId,
          params.cartItemId,
          body.quantity,
        );

        if (result === "cart_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Cart not found." };
        }

        if (result === "cart_item_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Cart item not found." };
        }

        if (result === "insufficient_stock") {
          ctx.set.status = 400;
          return { success: false, message: "Insufficient stock available." };
        }

        // setQuantity returns "cart_item_not_found" when quantity drops to 0
        // since the item is soft deleted in that case.
        if (result === "cart_item_not_found") {
          return { success: true, message: "Item removed from cart." };
        }

        return { success: true, data: result };
      },
      {
        body: t.Object({
          quantity: t.Number({ minimum: 0 }),
        }),
      },
    )

    // Increment or decrement a cart item quantity by a delta.
    // Pass positive delta to increment, negative to decrement.
    .patch(
      "/:cartItemId/adjust",
      async (ctx) => {
        const { userId, params, body } = ctx as any;
        const result = await incrementCartItem(
          userId,
          params.cartItemId,
          body.delta,
        );

        if (result === "cart_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Cart not found." };
        }

        if (result === "cart_item_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Cart item not found." };
        }

        if (result === "insufficient_stock") {
          ctx.set.status = 400;
          return { success: false, message: "Insufficient stock available." };
        }

        return { success: true, data: result };
      },
      {
        body: t.Object({
          // Positive to increment, negative to decrement.
          delta: t.Number(),
        }),
      },
    )

    // Remove a single item from the cart.
    .delete("/:cartItemId", async (ctx) => {
      const { userId, params } = ctx as any;
      const result = await removeCartItem(userId, params.cartItemId);

      if (result === "cart_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Cart not found." };
      }

      if (result === "cart_item_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Cart item not found." };
      }

      return { success: true, message: "Item removed from cart." };
    })

    // Clear all items from the cart.
    // Called automatically after a successful order placement.
    .delete("/", async (ctx) => {
      const { userId } = ctx as any;
      const result = await clearCart(userId);

      if (result === "cart_not_found") {
        ctx.set.status = 404;
        return { success: false, message: "Cart not found." };
      }

      return { success: true, message: "Cart cleared successfully." };
    }),
);
