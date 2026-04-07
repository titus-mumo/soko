import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import {
  placeOrder,
  getBuyerOrders,
  getBuyerOrderById,
  cancelOrder,
} from "../../services/order.service";

export const GetBuyerOrders = new Elysia()
  .use(authPlugin)
  .get("/me", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getBuyerOrders(userId);
    return { success: true, data: result };
  });

export const GetBuyerOrderById = new Elysia()
  .use(authPlugin)
  .get("/me/:orderId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await getBuyerOrderById(userId, params.orderId);

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }

    return { success: true, data: result };
  });

export const PlaceOrder = new Elysia().use(authPlugin).post(
  "/me",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await placeOrder(userId, body);

    if (result === "cart_not_found") {
      set.status = 404;
      return { success: false, message: "Cart not found." };
    }
    if (result === "cart_empty") {
      set.status = 400;
      return { success: false, message: "Your cart is empty." };
    }
    if (result === "address_not_found") {
      set.status = 404;
      return { success: false, message: "Delivery address not found." };
    }
    if (result === "delivery_zone_not_found") {
      set.status = 404;
      return {
        success: false,
        message: "No delivery zone found for your address.",
      };
    }
    if (result === "variant_not_found") {
      set.status = 404;
      return {
        success: false,
        message: "One or more products are no longer available.",
      };
    }
    if (result === "insufficient_stock") {
      set.status = 400;
      return {
        success: false,
        message: "Insufficient stock for one or more items.",
      };
    }

    set.status = 201;
    return { success: true, data: result };
  },
  {
    body: t.Object({
      deliveryAddressId: t.String(),
      notes: t.Optional(t.String()),
      promotionCode: t.Optional(t.String()),
    }),
  },
);

export const CancelOrder = new Elysia()
  .use(authPlugin)
  .patch("/me/:orderId/cancel", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await cancelOrder(userId, params.orderId);

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }
    if (result === "order_not_cancellable") {
      set.status = 400;
      return {
        success: false,
        message: "Order cannot be cancelled at this stage.",
      };
    }

    return { success: true, message: "Order cancelled successfully." };
  });
