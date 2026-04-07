import Elysia from "elysia";
import {
  GetBuyerOrders,
  GetBuyerOrderById,
  PlaceOrder,
  CancelOrder,
} from "./buyerOrders";
import {
  GetSellerOrderItems,
  GetSellerOrderItemsByStatus,
  UpdateOrderItemStatus,
} from "./sellerOrders";
import {
  GetOrdersByStatus,
  GetOrdersByPaymentStatus,
  AdminUpdateOrderStatus,
} from "./adminOrders";

export const orderRoutes = new Elysia().group("/orders", (app) =>
  app
    // Buyer
    .use(GetBuyerOrders)
    .use(GetBuyerOrderById)
    .use(PlaceOrder)
    .use(CancelOrder)
    // Seller
    .use(GetSellerOrderItems)
    .use(GetSellerOrderItemsByStatus)
    .use(UpdateOrderItemStatus)
    // Admin
    .use(GetOrdersByStatus)
    .use(GetOrdersByPaymentStatus)
    .use(AdminUpdateOrderStatus)
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
