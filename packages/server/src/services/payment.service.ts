import { getRepositories } from "../lib/repositories";
import { notifySellersOfPaidOrder, orderRef } from "./fulfilment";

const {
  paymentRepository,
  paymentLogRepository,
  errorLogRepository,
  orderRepository,
  notificationRepository,
  orderItemRepository,
} = getRepositories();

// ─────────────────────────────────────────
// Daraja Config
// ─────────────────────────────────────────

const IS_DARAJA_PRODUCTION = Bun.env.DARAJA_ENV === "production";

const DARAJA_BASE_URL = IS_DARAJA_PRODUCTION
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

// Outside production every STK prompt is for KES 1, whatever the order total.
// The order itself keeps its real total and is marked paid on success.
const SANDBOX_STK_AMOUNT = 1;

const DARAJA_CONSUMER_KEY = Bun.env.DARAJA_CONSUMER_KEY!;
const DARAJA_CONSUMER_SECRET = Bun.env.DARAJA_CONSUMER_SECRET!;
const DARAJA_SHORTCODE = Bun.env.DARAJA_SHORTCODE!;
const DARAJA_PASSKEY = Bun.env.DARAJA_PASSKEY!;
const DARAJA_CALLBACK_URL = Bun.env.DARAJA_CALLBACK_URL!;

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

// Daraja tokens are app-wide (not per order) and last ~1 hour, so one
// in-memory token serves every payment until shortly before it expires.
// (payments.access_token is a uuid column and can't hold these tokens.)
let cachedToken: { value: string; expiresAt: number } | null = null;

// Fetches a Daraja OAuth access token, reusing the cached one while valid.
async function getDarajaAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(
    `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`,
  ).toString("base64");

  const res = await fetch(
    `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${credentials}` },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Daraja access token: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: string;
  };

  // Refresh a minute early so a token never expires mid-request.
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (parseInt(data.expires_in) - 60) * 1000,
  };

  return data.access_token;
}

// Generates the base64 encoded password for STK push.
function generateStkPassword(): { password: string; timestamp: string } {
  // Daraja expects YYYYMMDDHHmmss in Kenyan time (EAT, UTC+3, no DST).
  const timestamp = new Date(Date.now() + 3 * 60 * 60 * 1000)
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);

  const password = Buffer.from(
    `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`,
  ).toString("base64");

  return { password, timestamp };
}

// ─────────────────────────────────────────
// STK Push
// ─────────────────────────────────────────

export async function initiatePayment(
  userId: string,
  orderId: string,
  phone: string,
): Promise<
  | "order_not_found"
  | "payment_already_paid"
  | "stk_push_failed"
  | "payment_initiated"
> {
  // Confirm the order exists and belongs to the buyer.
  const order = await orderRepository.findOrderByIdAndBuyerId(orderId, userId);
  if (order === "order_not_found") return "order_not_found";

  // Prevent re-initiating payment for an already paid order.
  const existingPayment = await paymentRepository.findPaymentByOrderId(orderId);
  if (existingPayment !== "payment_not_found" && existingPayment.paid) {
    return "payment_already_paid";
  }

  // Create or reset the payment record for this order.
  if (existingPayment === "payment_not_found") {
    await paymentRepository.insertPayment({
      orderId,
      status: "pending",
      paid: false,
      phone,
      amount: order.totalAmount,
    });
  }

  try {
    const accessToken = await getDarajaAccessToken();
    const { password, timestamp } = generateStkPassword();

    // Safaricom wants 2547XXXXXXXX: accept +254…, 254… or 07… input.
    const digits = phone.replace(/\D/g, "");
    const formattedPhone = digits.startsWith("0")
      ? `254${digits.slice(1)}`
      : digits;

    const res = await fetch(
      `${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: DARAJA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          // Daraja requires integer amounts.
          Amount: IS_DARAJA_PRODUCTION
            ? Math.ceil(parseFloat(order.totalAmount))
            : SANDBOX_STK_AMOUNT,
          PartyA: formattedPhone,
          PartyB: DARAJA_SHORTCODE,
          PhoneNumber: formattedPhone,
          CallBackURL: DARAJA_CALLBACK_URL,
          AccountReference: `SOKO-${orderId.slice(0, 8).toUpperCase()}`,
          TransactionDesc: `Payment for Soko order ${orderId.slice(0, 8)}`,
        }),
      },
    );

    const data = (await res.json()) as Record<string, unknown>;

    if (!res.ok || (data.ResponseCode as string) !== "0") {
      await errorLogRepository.insertErrorLog(
        "/payment/initiate",
        "STK push failed",
        data,
        { orderId, userId, phone },
      );
      return "stk_push_failed";
    }

    // Store the STK push metadata for matching against the callback.
    await paymentRepository.updateMetadata(orderId, data);

    return "payment_initiated";
  } catch (error) {
    await errorLogRepository.insertErrorLog(
      "/payment/initiate",
      (error as Error).message,
      {},
      { orderId, userId },
    );

    return "stk_push_failed";
  }
}

// ─────────────────────────────────────────
// Daraja Callback
// ─────────────────────────────────────────

export async function handleDarajaCallback(
  rawCallback: Record<string, unknown>,
): Promise<void> {
  // Always log the raw callback first before any processing —
  // captured even if subsequent steps throw.
  const body = rawCallback?.Body as Record<string, unknown>;
  const stkCallback = body?.stkCallback as Record<string, unknown>;
  const checkoutRequestId = stkCallback?.CheckoutRequestID as string;
  const resultCode = stkCallback?.ResultCode as number;

  // MerchantRequestID/CheckoutRequestID are Safaricom's ids, not ours — map
  // back to the order via the STK response saved when the push was sent.
  const payment = checkoutRequestId
    ? await paymentRepository.findPaymentByCheckoutRequestId(checkoutRequestId)
    : "payment_not_found";
  const orderId =
    payment === "payment_not_found"
      ? (checkoutRequestId ?? "unknown")
      : payment.orderId;

  await paymentLogRepository.insertPaymentLog(orderId, rawCallback);

  if (payment === "payment_not_found") {
    await errorLogRepository.insertErrorLog(
      "/payments/callback",
      "No payment matches callback CheckoutRequestID",
      rawCallback,
      { checkoutRequestId },
    );
    return;
  }

  try {
    if (resultCode === 0) {
      // Payment successful — flip the payment record and advance order status.
      await paymentRepository.markAsPaid(orderId, rawCallback);

      await orderRepository.updateOrderAndPaymentStatus(
        orderId,
        "confirmed",
        "paid",
      );

      // Advance all order items to confirmed.
      await orderItemRepository.updateStatusByOrderId(orderId, "confirmed");

      // Each seller hears once what to drop off at the hub.
      await notifySellersOfPaidOrder(orderId);

      // Notify the buyer of successful payment.
      const order = await orderRepository.findOrderById(orderId);
      if (order !== "order_not_found") {
        await notificationRepository.insertNotification({
          userId: order.buyerId,
          type: "payment_success",
          title: "Payment Successful",
          body: `Payment received for order ${orderRef(orderId)}. We're preparing it and will let you know when it ships.`,
          channel: "push",
        });
      }
    } else {
      // Payment failed — record the failure without cancelling the order
      // so the buyer can retry.
      await paymentRepository.markAsFailed(orderId, rawCallback);

      await orderRepository.updatePaymentStatus(orderId, "failed");

      const order = await orderRepository.findOrderById(orderId);
      if (order !== "order_not_found") {
        await notificationRepository.insertNotification({
          userId: order.buyerId,
          type: "payment_failed",
          title: "Payment Failed",
          body: `Your payment for order ${orderRef(orderId)} failed. Please try again.`,
          channel: "push",
        });
      }
    }
  } catch (error) {
    await errorLogRepository.insertErrorLog(
      "/payment/callback",
      (error as Error).message,
      rawCallback,
      { orderId },
    );
  }
}

// ─────────────────────────────────────────
// Query
// ─────────────────────────────────────────

export async function getPaymentByOrderId(
  userId: string,
  orderId: string,
): Promise<
  | "order_not_found"
  | "payment_not_found"
  | Awaited<ReturnType<typeof paymentRepository.findPaymentByOrderId>>
> {
  // Scope to the buyer to prevent accessing another user's payment.
  const order = await orderRepository.findOrderByIdAndBuyerId(orderId, userId);
  if (order === "order_not_found") return "order_not_found";

  return await paymentRepository.findPaymentByOrderId(orderId);
}
