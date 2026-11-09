import Elysia from "elysia";
import {
  handleDarajaCallback,
  isGenuineCallback,
} from "../../services/payment.service";

// Publicly accessible — Safaricom calls this after an STK push completes.
// It's authenticated by the secret in the callback URL we hand Safaricom
// (DARAJA_CALLBACK_SECRET → ?key=…); anything without it is ignored.
export const DarajaCallback = new Elysia().post("/callback", async (ctx) => {
  const { body, query, set } = ctx as any;

  if (!isGenuineCallback(query?.key)) {
    set.status = 403;
    return { ResultCode: 1, ResultDesc: "Rejected" };
  }

  try {
    await handleDarajaCallback(body as Record<string, unknown>);
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
