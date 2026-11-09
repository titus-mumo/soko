import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import { initiatePayment } from "../../services/payment.service";

export const InitiatePayment = new Elysia().use(authPlugin).post(
  "/me/initiate",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await initiatePayment(userId, body.orderId, body.phone);

    if (result === "order_not_found") {
      set.status = 404;
      return { success: false, message: "Order not found." };
    }
    if (result === "order_not_payable") {
      set.status = 400;
      return {
        success: false,
        message: "This order can't be paid for — it's been cancelled.",
      };
    }
    if (result === "payment_already_paid") {
      set.status = 400;
      return { success: false, message: "This order has already been paid." };
    }
    if (result === "stk_push_failed") {
      set.status = 500;
      return {
        success: false,
        message: "Failed to initiate payment. Please try again.",
      };
    }

    return {
      success: true,
      message: "Payment initiated. Please check your phone for the prompt.",
    };
  },
  {
    body: t.Object({
      orderId: t.String(),
      phone: t.String({ minLength: 10 }),
    }),
  },
);
