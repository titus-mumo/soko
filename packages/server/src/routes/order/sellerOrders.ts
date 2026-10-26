import Elysia, { t } from "elysia";
import { pageParams, paged } from "../../lib/paging";
import { sellerPlugin } from "../../middleware/auth.middleware";
import {
  getSellerOrderItems,
  getSellerStats,
  getSellerOrderItemsByStatus,
  updateOrderItemStatus,
} from "../../services/order.service";
import { sellerOrderItem } from "../../lib/views";

export const GetSellerStats = new Elysia()
  .use(sellerPlugin)
  .get("/seller/stats", async (ctx) => {
    const { userId, set } = ctx as any;
    const result = await getSellerStats(userId);
    if (result === "seller_not_found") {
      set.status = 404;
      return { success: false, message: "Seller profile not found." };
    }
    return { success: true, data: result };
  });

export const GetSellerOrderItems = new Elysia()
  .use(sellerPlugin)
  .get("/seller/items", async (ctx) => {
    const { userId, query } = ctx as any;
    return paged(
      await getSellerOrderItems(userId, pageParams(query)),
      sellerOrderItem,
    );
  });

export const GetSellerOrderItemsByStatus = new Elysia()
  .use(sellerPlugin)
  .get("/seller/items/:status", async (ctx) => {
    const { userId, params, query } = ctx as any;
    return paged(
      await getSellerOrderItemsByStatus(
        userId,
        params.status,
        pageParams(query),
      ),
      sellerOrderItem,
    );
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
    if (result === "invalid_transition") {
      set.status = 400;
      return {
        success: false,
        message: "That step isn't available for this item right now.",
      };
    }

    return { success: true, message: "Order item status updated." };
  },
  {
    body: t.Object({
      // Sellers pack and drop off at the hub, or cancel. The hub does the rest.
      status: t.Union([
        t.Literal("processing"),
        t.Literal("dropped_off"),
        t.Literal("cancelled"),
      ]),
    }),
  },
);
