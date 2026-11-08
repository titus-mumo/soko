import Elysia, { t } from "elysia";
import { pageParams, paged } from "../../lib/paging";
import { authPlugin } from "../../middleware/auth.middleware";
import type { OrderStatus } from "db-operations";
import {
  placeOrder,
  getBuyerOrders,
  getBuyerOrderStats,
  getBuyerOrderById,
  cancelOrder,
} from "../../services/order.service";
import { buyerOrder, buyerOrderItem } from "../../lib/views";
import { shownStock } from "../../lib/views";
import type { PromoProblem } from "../../services/promotion.service";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "dropped_off",
  "at_hub",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export const GetBuyerOrderStats = new Elysia()
  .use(authPlugin)
  .get("/me/stats", async (ctx) => {
    const { userId } = ctx as any;
    return { success: true, data: await getBuyerOrderStats(userId) };
  });

export const GetBuyerOrders = new Elysia()
  .use(authPlugin)
  .get("/me", async (ctx) => {
    const { userId, query, set } = ctx as any;
    const status = query?.status as OrderStatus | undefined;
    if (status && !ORDER_STATUSES.includes(status)) {
      set.status = 400;
      return { success: false, message: "Unknown order status." };
    }
    return paged(
      await getBuyerOrders(userId, pageParams(query), status),
      buyerOrder,
    );
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

    return {
      success: true,
      data: {
        order: buyerOrder(result.order),
        items: result.items.map(buyerOrderItem),
      },
    };
  });

/** Why a promo code didn't apply at checkout, in the buyer's words. */
const PROMO_MESSAGES: Record<PromoProblem, string> = {
  promotion_not_found: "That promo code doesn't exist.",
  promotion_inactive: "That promo code is no longer active.",
  promotion_expired: "That promo code has expired.",
  promotion_exhausted: "That promo code has been used up.",
  minimum_order_not_met:
    "Your order doesn't meet the minimum amount for that promo code.",
};

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
    if (typeof result === "object" && "promo" in result) {
      set.status = 400;
      return {
        success: false,
        code: "PROMO_INVALID",
        message: PROMO_MESSAGES[result.promo],
      };
    }
    if (typeof result === "object" && "insufficientStock" in result) {
      set.status = 400;
      return {
        success: false,
        code: "INSUFFICIENT_STOCK",
        variantId: result.variantId,
        available: shownStock(result.available),
        message:
          result.available > 0
            ? `Only ${shownStock(result.available)} of an item in your cart ${result.available === 1 ? "is" : "are"} left. Update your cart to continue.`
            : "An item in your cart just sold out. Remove it to continue.",
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
