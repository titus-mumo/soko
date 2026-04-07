import Elysia from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import { getPaymentByOrderId } from "../../services/payment.service";

export const GetPaymentByOrderId = new Elysia()
  .use(authPlugin)
  .get("/me/:orderId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await getPaymentByOrderId(userId, params.orderId);

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }
    if (result === "payment_not_found") {
      set.status = 404;
      return { success: false, message: "Payment not found." };
    }

    return { success: true, data: result };
  });
