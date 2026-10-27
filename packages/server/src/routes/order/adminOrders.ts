import Elysia, { t } from "elysia";
import { pageParams, paged } from "../../lib/paging";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  cancelOrderItem,
  getOrdersByStatus,
  getOrdersByPaymentStatus,
  adminUpdateOrderStatus,
  getHubOrders,
  receiveItemAtHub,
} from "../../services/order.service";

export const GetOrdersByStatus = new Elysia()
  .use(adminPlugin)
  .get("/admin/status/:status", async (ctx) => {
    const { params, query } = ctx as any;
    return paged(await getOrdersByStatus(params.status, pageParams(query)));
  });

export const GetOrdersByPaymentStatus = new Elysia()
  .use(adminPlugin)
  .get("/admin/payment-status/:paymentStatus", async (ctx) => {
    const { params, query } = ctx as any;
    return paged(
      await getOrdersByPaymentStatus(params.paymentStatus, pageParams(query)),
    );
  });

export const AdminUpdateOrderStatus = new Elysia().use(adminPlugin).patch(
  "/admin/:orderId/status",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await adminUpdateOrderStatus(params.orderId, body.status);

    if (result === "order_not_found") {
      set.status = 404;
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
        t.Literal("dropped_off"),
        t.Literal("at_hub"),
        t.Literal("shipped"),
        t.Literal("delivered"),
        t.Literal("cancelled"),
        t.Literal("refunded"),
      ]),
    }),
  },
);

// Hub: paid orders being consolidated or in transit.
export const GetHubOrders = new Elysia()
  .use(adminPlugin)
  .get("/admin/hub", async () => {
    return { success: true, data: await getHubOrders() };
  });

// Hub: an item has been handed in.
export const CancelOrderItem = new Elysia()
  .use(adminPlugin)
  .patch("/admin/items/:orderItemId/cancel", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await cancelOrderItem(params.orderItemId);

    if (result === "order_item_not_found") {
      set.status = 404;
      return { success: false, message: "Order item not found." };
    }
    if (result === "invalid_transition") {
      set.status = 400;
      return {
        success: false,
        message: "Shipped, delivered or cancelled items can't be cancelled.",
      };
    }

    return { success: true, message: "Item cancelled." };
  });

export const ReceiveItemAtHub = new Elysia()
  .use(adminPlugin)
  .patch("/admin/items/:orderItemId/received", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await receiveItemAtHub(params.orderItemId);

    if (result === "order_item_not_found") {
      set.status = 404;
      return { success: false, message: "Order item not found." };
    }
    if (result === "invalid_transition") {
      set.status = 400;
      return {
        success: false,
        message: "This item can't be received in its current state.",
      };
    }

    return { success: true, message: "Item received at the hub." };
  });
