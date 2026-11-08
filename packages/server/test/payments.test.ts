import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createUser,
  deliverOrder,
  missingId,
  ok,
  placeOrder,
  Tracker,
  type Market,
} from "./helpers";
import { CALLBACK_PATH, DARAJA_REJECTED_PHONE, lastStk } from "./setup";

const t = new Tracker();
let m: Market;

beforeAll(async () => {
  m = await createMarket(t);
});
afterAll(() => t.cleanup());

/** Starts an STK push and returns the CheckoutRequestID Safaricom would echo. */
async function initiate(orderId: string) {
  ok(
    await api("POST", "/payments/me/initiate", {
      token: m.buyer.token,
      body: { orderId, phone: m.buyer.phone },
    }),
  );
  // The mock's STK response is stored as payment metadata; read it back via
  // the payment record the callback will be matched against.
  const payment = ok(
    await api("GET", `/payments/me/${orderId}`, { token: m.buyer.token }),
  );
  return payment;
}

/** What Safaricom POSTs to the callback URL. */
const callback = (
  checkoutRequestId: string,
  resultCode: number,
  amount = 1,
) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: `mock-merchant-${checkoutRequestId}`,
      CheckoutRequestID: checkoutRequestId,
      ResultCode: resultCode,
      ResultDesc:
        resultCode === 0
          ? "The service request is processed successfully."
          : "Request cancelled by user",
      ...(resultCode === 0 && {
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amount },
            { Name: "MpesaReceiptNumber", Value: "TST123ABC" },
            { Name: "PhoneNumber", Value: 254712345678 },
          ],
        },
      }),
    },
  },
});

describe("POST /payments/me/initiate", () => {
  test("starts an STK push and records a pending payment", async () => {
    const { orderId, total } = await placeOrder(m);
    const payment = await initiate(orderId);
    expect(payment.status).toBe("pending");
    expect(payment.paid).toBe(false);
    expect(Number(payment.amount)).toBe(Number(total));
  });

  test("accepts +254, 254 and 07 phone formats", async () => {
    for (const phone of ["+254712345678", "254712345678", "0712345678"]) {
      const { orderId } = await placeOrder(m);
      const res = await api("POST", "/payments/me/initiate", {
        token: m.buyer.token,
        body: { orderId, phone },
      });
      expect(res.status).toBe(200);
    }
  });

  test("500 when Daraja rejects the request", async () => {
    const { orderId } = await placeOrder(m);
    const res = await api("POST", "/payments/me/initiate", {
      token: m.buyer.token,
      body: { orderId, phone: DARAJA_REJECTED_PHONE },
    });
    expect(res.status).toBe(500);
  });

  test("404 for someone else's order", async () => {
    const { orderId } = await placeOrder(m);
    const other = await createUser(t);
    const res = await api("POST", "/payments/me/initiate", {
      token: other.token,
      body: { orderId, phone: other.phone },
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /payments/callback", () => {
  test("a successful callback marks the payment and order paid", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    const checkoutId = await checkoutRequestIdFor(orderId);

    const res = await api("POST", CALLBACK_PATH, {
      body: callback(checkoutId, 0),
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ResultCode: 0, ResultDesc: "Accepted" });

    const payment = ok(
      await api("GET", `/payments/me/${orderId}`, { token: m.buyer.token }),
    );
    expect(payment.status).toBe("paid");
    const detail = ok(
      await api("GET", `/orders/me/${orderId}`, { token: m.buyer.token }),
    );
    expect(detail.order.paymentStatus).toBe("paid");
    expect(detail.order.status).toBe("confirmed");
    expect(detail.items[0].status).toBe("confirmed");
  });

  test("a paid order can't be charged again", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    await api("POST", CALLBACK_PATH, {
      body: callback(await checkoutRequestIdFor(orderId), 0),
    });
    const res = await api("POST", "/payments/me/initiate", {
      token: m.buyer.token,
      body: { orderId, phone: m.buyer.phone },
    });
    expect(res.status).toBe(400);
  });

  test("a failed callback marks the payment failed and keeps the order", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    await api("POST", CALLBACK_PATH, {
      body: callback(await checkoutRequestIdFor(orderId), 1032),
    });
    const payment = ok(
      await api("GET", `/payments/me/${orderId}`, { token: m.buyer.token }),
    );
    expect(payment.status).toBe("failed");
    const detail = ok(
      await api("GET", `/orders/me/${orderId}`, { token: m.buyer.token }),
    );
    expect(detail.order.paymentStatus).toBe("failed");
    expect(detail.order.status).toBe("pending");
  });

  test("an unmatched callback is acknowledged but changes nothing", async () => {
    const res = await api("POST", CALLBACK_PATH, {
      body: callback(`ws_CO_unknown_${missingId()}`, 0),
    });
    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(0);
  });

  test("a malformed callback is still acknowledged", async () => {
    const res = await api("POST", CALLBACK_PATH, {
      body: { junk: true },
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /payments/me/:orderId", () => {
  test("404 before any payment is started", async () => {
    const { orderId } = await placeOrder(m);
    expect(
      (await api("GET", `/payments/me/${orderId}`, { token: m.buyer.token }))
        .status,
    ).toBe(404);
  });

  test("404 for another buyer's order", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    const other = await createUser(t);
    expect(
      (await api("GET", `/payments/me/${orderId}`, { token: other.token }))
        .status,
    ).toBe(404);
  });
});

/**
 * The CheckoutRequestID lives in the payment's metadata, which the API
 * doesn't expose — read it straight from the database like Safaricom's
 * callback effectively does.
 */
async function checkoutRequestIdFor(orderId: string): Promise<string> {
  const { getRepositories } = await import("../src/lib/repositories");
  const payment =
    await getRepositories().paymentRepository.findPaymentByOrderId(orderId);
  if (payment === "payment_not_found") throw new Error("no payment");
  return (payment.metadata as { CheckoutRequestID: string }).CheckoutRequestID;
}

describe("callback safety", () => {
  const order = async (orderId: string) =>
    ok(await api("GET", `/orders/me/${orderId}`, { token: m.buyer.token }))
      .order;
  const paymentOf = async (orderId: string) =>
    ok(await api("GET", `/payments/me/${orderId}`, { token: m.buyer.token }));
  const adminInbox = async () =>
    ok(await api("GET", "/notifications/me", { token: m.admin.token })) as {
      type: string;
      body: string;
    }[];
  const ref = (orderId: string) => orderId.slice(-8).toUpperCase();
  const succeed = async (orderId: string, amount = 1) =>
    api("POST", CALLBACK_PATH, {
      body: callback(await checkoutRequestIdFor(orderId), 0, amount),
    });

  test("Safaricom is given a callback URL carrying the secret", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    expect(lastStk.callbackUrl).toContain(
      `key=${process.env.DARAJA_CALLBACK_SECRET}`,
    );
  });

  test("a callback without the secret is rejected and changes nothing", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    const body = callback(await checkoutRequestIdFor(orderId), 0);
    for (const path of ["/payments/callback", "/payments/callback?key=guess"])
      expect((await api("POST", path, { body })).status).toBe(403);
    expect((await paymentOf(orderId)).status).toBe("pending");
    expect((await order(orderId)).status).toBe("pending");
  });

  test("paying less than requested doesn't confirm the order; admins are told", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    await succeed(orderId, 0);
    expect((await paymentOf(orderId)).status).toBe("pending");
    expect((await order(orderId)).status).toBe("pending");
    expect(
      (await adminInbox()).some(
        (n) => n.type === "payment_mismatch" && n.body.includes(ref(orderId)),
      ),
    ).toBe(true);
  });

  test("a replayed success callback doesn't undo later progress", async () => {
    const placed = await placeOrder(m);
    await initiate(placed.orderId);
    await succeed(placed.orderId);
    await deliverOrder(m, placed);
    await succeed(placed.orderId);
    expect((await order(placed.orderId)).status).toBe("delivered");
  });

  test("a late failure callback doesn't un-pay a paid order", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    await succeed(orderId);
    await api("POST", CALLBACK_PATH, {
      body: callback(await checkoutRequestIdFor(orderId), 1032),
    });
    expect((await paymentOf(orderId)).status).toBe("paid");
    expect((await order(orderId)).paymentStatus).toBe("paid");
  });

  test("a cancelled order can't be paid for", async () => {
    const { orderId } = await placeOrder(m);
    ok(
      await api("PATCH", `/orders/me/${orderId}/cancel`, {
        token: m.buyer.token,
      }),
    );
    const res = await api("POST", "/payments/me/initiate", {
      token: m.buyer.token,
      body: { orderId, phone: m.buyer.phone },
    });
    expect(res.status).toBe(400);
  });

  test("a payment landing after cancelling stays cancelled and is flagged for refund", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    ok(
      await api("PATCH", `/orders/me/${orderId}/cancel`, {
        token: m.buyer.token,
      }),
    );
    await succeed(orderId);
    const o = await order(orderId);
    expect(o.status).toBe("cancelled");
    expect(o.paymentStatus).toBe("paid");
    expect(
      (await adminInbox()).some(
        (n) => n.type === "refund_due" && n.body.includes(ref(orderId)),
      ),
    ).toBe(true);
  });

  test("cancelling a paid order asks admins to refund instead of claiming it's done", async () => {
    const { orderId } = await placeOrder(m);
    await initiate(orderId);
    await succeed(orderId);
    ok(
      await api("PATCH", `/orders/me/${orderId}/cancel`, {
        token: m.buyer.token,
      }),
    );
    const o = await order(orderId);
    expect(o.status).toBe("cancelled");
    expect(o.paymentStatus).toBe("paid");
    expect(
      (await adminInbox()).some(
        (n) => n.type === "refund_due" && n.body.includes(ref(orderId)),
      ),
    ).toBe(true);
  });
});
