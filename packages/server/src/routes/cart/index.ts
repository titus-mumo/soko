import Elysia from "elysia";
import { GetCartItems, GetCartSummary } from "./getCart";
import { AddToCart } from "./addToCart";
import { UpdateCartItemQuantity, AdjustCartItemQuantity } from "./updateCart";
import { RemoveCartItem, ClearCart } from "./removeFromCart";

export const cartRoutes = new Elysia().group("/cart", (app) =>
  app
    .use(GetCartItems)
    .use(GetCartSummary)
    .use(AddToCart)
    .use(UpdateCartItemQuantity)
    .use(AdjustCartItemQuantity)
    .use(RemoveCartItem)
    .use(ClearCart)
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
