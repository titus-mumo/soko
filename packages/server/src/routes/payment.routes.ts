import Elysia, { t } from "elysia";
import { authPlugin } from "../middleware/auth.middleware";
import {
  initiatePayment,
  handleDarajaCallback,
  getPaymentByOrderId,
} from "../services/payment.service";

export const paymentRoutes = new Elysia({ prefix: "/payments" })

  // ─────────────────────────────────────────
  // Buyer
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(authPlugin)

      // Initiate an STK push for an order.
      // The buyer receives a payment prompt on their phone.
      .post(
        "/initiate",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await initiatePayment(
            userId,
            body.orderId,
            body.phone,
          );

          if (result === "order_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Order not found." };
          }

          if (result === "payment_already_paid") {
            ctx.set.status = 400;
            return {
              success: false,
              message: "This order has already been paid.",
            };
          }

          if (result === "stk_push_failed") {
            ctx.set.status = 500;
            return {
              success: false,
              message: "Failed to initiate payment. Please try again.",
            };
          }

          return {
            success: true,
            message:
              "Payment initiated. Please check your phone for the prompt.",
          };
        },
        {
          body: t.Object({
            orderId: t.String(),
            // Phone number in local format e.g. 0712345678 or international +254712345678.
            phone: t.String({ minLength: 10 }),
          }),
        },
      )

      // Get payment details for a specific order.
      .get("/:orderId", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await getPaymentByOrderId(userId, params.orderId);

        if (result === "order_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Order not found." };
        }

        if (result === "payment_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Payment not found." };
        }

        return { success: true, data: result };
      }),
  )

  // ─────────────────────────────────────────
  // Daraja Callback
  // ─────────────────────────────────────────

  // This endpoint is called by Safaricom after an STK push completes.
  // It must be publicly accessible — do not protect with authMiddleware.
  // Secure it via IP whitelisting on your server/proxy instead.
  .post("/callback", async (ctx) => {
    const body = ctx.body as Record<string, unknown>;

    try {
      await handleDarajaCallback(body);
    } catch (error) {
      // Always return 200 to Safaricom even on internal errors —
      // a non-200 response causes Safaricom to retry the callback.
      console.error("Callback processing error:", error);
    }

    // Safaricom expects this exact response shape to acknowledge receipt.
    return {
      ResultCode: 0,
      ResultDesc: "Accepted",
    };
  });
