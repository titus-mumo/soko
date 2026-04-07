import Elysia from "elysia";
import { handleDarajaCallback } from "../../services/payment.service";

// Publicly accessible — Safaricom calls this after an STK push completes.
// Secure via IP whitelisting on your server/proxy, not via auth middleware.
export const DarajaCallback = new Elysia().post("/callback", async (ctx) => {
  const body = ctx.body as Record<string, unknown>;

  try {
    await handleDarajaCallback(body);
  } catch (error) {
    // Always return 200 even on internal errors —
    // a non-200 response causes Safaricom to retry the callback.
    console.error("Callback processing error:", error);
  }

  // Safaricom expects this exact shape to acknowledge receipt.
  return {
    ResultCode: 0,
    ResultDesc: "Accepted",
  };
});
