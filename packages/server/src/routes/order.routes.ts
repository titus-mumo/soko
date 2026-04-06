import Elysia, { t } from "elysia";
import {
  authPlugin,
  adminPlugin,
  sellerPlugin,
} from "../middleware/auth.middleware";
import {
  placeOrder,
  getBuyerOrders,
  getBuyerOrderById,
  cancelOrder,
  getSellerOrderItems,
  getSellerOrderItemsByStatus,
  updateOrderItemStatus,
  getOrdersByStatus,
  getOrdersByPaymentStatus,
  adminUpdateOrderStatus,
} from "../services/order.service";

export const orderRoutes = new Elysia({ prefix: "/orders" })

  // ─────────────────────────────────────────
  // Buyer
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(adminPlugin())

      // Get all orders for the current buyer.
      .get("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getBuyerOrders(userId);
        return { success: true, data: result };
      })

      // Get a specific order with its items.
      .get("/:orderId", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await getBuyerOrderById(userId, params.orderId);

        if (result === "order_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Order not found." };
        }

        return { success: true, data: result };
      })

      // Place a new order from the current cart.
      .post(
        "/",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await placeOrder(userId, body);

          if (result === "cart_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Cart not found." };
          }

          if (result === "cart_empty") {
            ctx.set.status = 400;
            return { success: false, message: "Your cart is empty." };
          }

          if (result === "address_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Delivery address not found." };
          }

          if (result === "delivery_zone_not_found") {
            ctx.set.status = 404;
            return {
              success: false,
              message: "No delivery zone found for your address.",
            };
          }

          if (result === "variant_not_found") {
            ctx.set.status = 404;
            return {
              success: false,
              message: "One or more products are no longer available.",
            };
          }

          if (result === "insufficient_stock") {
            ctx.set.status = 400;
            return {
              success: false,
              message: "Insufficient stock for one or more items.",
            };
          }

          ctx.set.status = 201;
          return { success: true, data: result };
        },
        {
          body: t.Object({
            deliveryAddressId: t.String(),
            notes: t.Optional(t.String()),
            promotionCode: t.Optional(t.String()),
          }),
        },
      )

      // Cancel an order — only allowed for pending or confirmed orders.
      .patch("/:orderId/cancel", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await cancelOrder(userId, params.orderId);

        if (result === "order_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Order not found." };
        }

        if (result === "order_not_cancellable") {
          ctx.set.status = 400;
          return {
            success: false,
            message: "Order cannot be cancelled at this stage.",
          };
        }

        return { success: true, message: "Order cancelled successfully." };
      }),
  )

  // ─────────────────────────────────────────
  // Seller
  // ─────────────────────────────────────────

  .group("/seller", (app) =>
    app
      .use(sellerPlugin())

      // Get all order items assigned to the current seller.
      .get("/items", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getSellerOrderItems(userId);
        return { success: true, data: result };
      })

      // Get seller order items filtered by status.
      // Use this to power seller pipeline views e.g. items to ship.
      .get("/items/:status", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await getSellerOrderItemsByStatus(userId, params.status);
        return { success: true, data: result };
      })

      // Update the status of a specific order item.
      // Sellers advance their own items independently.
      .patch(
        "/items/:orderItemId/status",
        async (ctx) => {
          const { userId, params, body } = ctx as any;
          const result = await updateOrderItemStatus(
            userId,
            params.orderItemId,
            body.status,
          );

          if (result === "order_item_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Order item not found." };
          }

          return { success: true, message: "Order item status updated." };
        },
        {
          body: t.Object({
            status: t.Union([
              t.Literal("pending"),
              t.Literal("confirmed"),
              t.Literal("processing"),
              t.Literal("shipped"),
              t.Literal("delivered"),
              t.Literal("cancelled"),
              t.Literal("refunded"),
            ]),
          }),
        },
      ),
  )

  // ─────────────────────────────────────────
  // Admin
  // ─────────────────────────────────────────

  .group("/admin", (app) =>
    app
      .use(adminPlugin())

      // Get all orders filtered by status.
      .get("/status/:status", async (ctx) => {
        const { params } = ctx as any;
        const result = await getOrdersByStatus(params.status);
        return { success: true, data: result };
      })

      // Get all orders filtered by payment status.
      .get("/payment-status/:paymentStatus", async (ctx) => {
        const { params } = ctx as any;
        const result = await getOrdersByPaymentStatus(params.paymentStatus);
        return { success: true, data: result };
      })

      // Update an order's status — admin level bulk transitions.
      .patch(
        "/:orderId/status",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await adminUpdateOrderStatus(
            params.orderId,
            body.status,
          );

          if (result === "order_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Order not found." };
          }

          return { success: true, message: "Order status updated." };
        },
        {
          body: t.Object({
            status: t.Union([
              t.Literal("pending"),
              t.Literal("confirmed"),
              t.Literal("processing"),
              t.Literal("shipped"),
              t.Literal("delivered"),
              t.Literal("cancelled"),
              t.Literal("refunded"),
            ]),
          }),
        },
      ),
  );
