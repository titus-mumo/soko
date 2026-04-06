import { getRepositories } from "../lib/repositories";

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

const DARAJA_BASE_URL =
  Bun.env.DARAJA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const DARAJA_CONSUMER_KEY = Bun.env.DARAJA_CONSUMER_KEY!;
const DARAJA_CONSUMER_SECRET = Bun.env.DARAJA_CONSUMER_SECRET!;
const DARAJA_SHORTCODE = Bun.env.DARAJA_SHORTCODE!;
const DARAJA_PASSKEY = Bun.env.DARAJA_PASSKEY!;
const DARAJA_CALLBACK_URL = Bun.env.DARAJA_CALLBACK_URL!;

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

// Fetches a Daraja OAuth access token and caches it against the payment record.
async function getDarajaAccessToken(orderId: string): Promise<string> {
  // Check if a valid cached token exists for this order.
  const payment = await paymentRepository.findPaymentByOrderId(orderId);

  if (
    payment !== "payment_not_found" &&
    payment.accessToken &&
    payment.expiresAt &&
    payment.expiresAt > new Date()
  ) {
    return payment.accessToken;
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

  // Cache the token against the payment record — expires in ~1 hour.
  const expiresAt = new Date(Date.now() + parseInt(data.expires_in) * 1000);
  await paymentRepository.updateAccessToken(
    orderId,
    data.access_token,
    expiresAt,
  );

  return data.access_token;
}

// Generates the base64 encoded password for STK push.
function generateStkPassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
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
    const accessToken = await getDarajaAccessToken(orderId);
    const { password, timestamp } = generateStkPassword();

    // Format phone to Safaricom's required format e.g. 0712345678 → 254712345678.
    const formattedPhone = phone.startsWith("0")
      ? `254${phone.slice(1)}`
      : phone;

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
          Amount: Math.ceil(parseFloat(order.totalAmount)), // Daraja requires integer amounts
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
  const orderId = stkCallback?.MerchantRequestID as string;
  const resultCode = stkCallback?.ResultCode as number;

  await paymentLogRepository.insertPaymentLog(orderId, rawCallback);

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

      // Notify the buyer of successful payment.
      const order = await orderRepository.findOrderById(orderId);
      if (order !== "order_not_found") {
        await notificationRepository.insertNotification({
          userId: order.buyerId,
          type: "payment_success",
          title: "Payment Successful",
          body: `Your payment for order #${orderId.slice(0, 8)} was successful.`,
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
          body: `Your payment for order #${orderId.slice(0, 8)} failed. Please try again.`,
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
