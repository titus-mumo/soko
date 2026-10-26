import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createUser,
  missingId,
  ok,
  placeOrder,
  Tracker,
  type Market,
} from "./helpers";
import { DARAJA_REJECTED_PHONE } from "./setup";

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
const callback = (checkoutRequestId: string, resultCode: number) => ({
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
            { Name: "Amount", Value: 1 },
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

    const res = await api("POST", "/payments/callback", {
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
    await api("POST", "/payments/callback", {
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
    await api("POST", "/payments/callback", {
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
    const res = await api("POST", "/payments/callback", {
      body: callback(`ws_CO_unknown_${missingId()}`, 0),
    });
    expect(res.status).toBe(200);
    expect(res.body.ResultCode).toBe(0);
  });

  test("a malformed callback is still acknowledged", async () => {
    const res = await api("POST", "/payments/callback", {
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
