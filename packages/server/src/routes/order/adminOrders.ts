import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  getOrdersByStatus,
  getOrdersByPaymentStatus,
  adminUpdateOrderStatus,
} from "../../services/order.service";

export const GetOrdersByStatus = new Elysia()
  .use(adminPlugin)
  .get("/admin/status/:status", async (ctx) => {
    const { params } = ctx as any;
    const result = await getOrdersByStatus(params.status);
    return { success: true, data: result };
  });

export const GetOrdersByPaymentStatus = new Elysia()
  .use(adminPlugin)
  .get("/admin/payment-status/:paymentStatus", async (ctx) => {
    const { params } = ctx as any;
    const result = await getOrdersByPaymentStatus(params.paymentStatus);
    return { success: true, data: result };
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
        t.Literal("shipped"),
        t.Literal("delivered"),
        t.Literal("cancelled"),
        t.Literal("refunded"),
      ]),
    }),
  },
);
