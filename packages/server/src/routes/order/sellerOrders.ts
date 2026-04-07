import Elysia, { t } from "elysia";
import { sellerPlugin } from "../../middleware/auth.middleware";
import {
  getSellerOrderItems,
  getSellerOrderItemsByStatus,
  updateOrderItemStatus,
} from "../../services/order.service";

export const GetSellerOrderItems = new Elysia()
  .use(sellerPlugin)
  .get("/seller/items", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getSellerOrderItems(userId);
    return { success: true, data: result };
  });

export const GetSellerOrderItemsByStatus = new Elysia()
  .use(sellerPlugin)
  .get("/seller/items/:status", async (ctx) => {
    const { userId, params } = ctx as any;
    const result = await getSellerOrderItemsByStatus(userId, params.status);
    return { success: true, data: result };
  });

export const UpdateOrderItemStatus = new Elysia().use(sellerPlugin).patch(
  "/seller/items/:orderItemId/status",
  async (ctx) => {
    const { userId, params, body, set } = ctx as any;
    const result = await updateOrderItemStatus(
      userId,
      params.orderItemId,
      body.status,
    );

    if (result === "order_item_not_found") {
      set.status = 404;
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
);
