import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createAddress,
  createMarket,
  createSeller,
  createUser,
  missingId,
  ok,
  placeOrder,
  placePaidOrder,
  Tracker,
  type Market,
  type TestSeller,
} from "./helpers";

const t = new Tracker();
let m: Market;
let otherSeller: TestSeller;

beforeAll(async () => {
  m = await createMarket(t);
  otherSeller = await createSeller(t);
});
afterAll(() => t.cleanup());

const stock = async () =>
  ok<{ variants: { id: string; stockQuantity: number }[] }>(
    await api("GET", `/products/admin/${m.product.id}`, {
      token: m.admin.token,
    }),
  ).variants.find((v) => v.id === m.product.variantId)!.stockQuantity;

describe("placing orders", () => {
  test("POST /orders/me is 404 without a cart", async () => {
    const buyer = await createUser(t);
    const address = await createAddress(buyer, m.zone.county);
    const res = await api("POST", "/orders/me", {
      token: buyer.token,
      body: { deliveryAddressId: address.id },
    });
    expect(res.status).toBe(404);
  });

  test("POST /orders/me is 400 for an empty cart", async () => {
    ok(
      await api("POST", "/cart", {
        token: m.buyer.token,
        body: { productVariantId: m.product.variantId },
      }),
      201,
    );
    ok(await api("DELETE", "/cart", { token: m.buyer.token }));
    const res = await api("POST", "/orders/me", {
      token: m.buyer.token,
      body: { deliveryAddressId: m.address.id },
    });
    expect(res.status).toBe(400);
  });

  test("POST /orders/me is 404 for someone else's address", async () => {
    const other = await createUser(t);
    const theirAddress = await createAddress(other, m.zone.county);
    ok(
      await api("POST", "/cart", {
        token: m.buyer.token,
        body: { productVariantId: m.product.variantId },
      }),
      201,
    );
    const res = await api("POST", "/orders/me", {
      token: m.buyer.token,
      body: { deliveryAddressId: theirAddress.id },
    });
    expect(res.status).toBe(404);
    ok(await api("DELETE", "/cart", { token: m.buyer.token }));
  });

  test("POST /orders/me is 404 when the county has no delivery zone", async () => {
    const buyer = await createUser(t);
    const address = await createAddress(
      buyer,
      `Nowhere${missingId().slice(0, 8)}`,
    );
    ok(
      await api("POST", "/cart", {
        token: buyer.token,
        body: { productVariantId: m.product.variantId },
      }),
      201,
    );
    const res = await api("POST", "/orders/me", {
      token: buyer.token,
      body: { deliveryAddressId: address.id },
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/delivery zone/i);
  });

  test("places an order: totals, stock and cart are all right", async () => {
    const before = await stock();
    const { orderId, total } = await placeOrder(m, 2);

    // subtotal + the zone's 150.00 delivery fee
    expect(Number(total)).toBe(m.product.price * 2 + 150);
    expect(await stock()).toBe(before - 2);
    expect(
      ok<unknown[]>(await api("GET", "/cart", { token: m.buyer.token })),
    ).toEqual([]);

    const detail = ok(
      await api("GET", `/orders/me/${orderId}`, { token: m.buyer.token }),
    );
    expect(detail.order.status).toBe("pending");
    expect(detail.items).toHaveLength(1);
    // One order, shipped by Soko: buyers never see which store.
    expect(detail.items[0]).not.toHaveProperty("sellerId");
    expect(detail.order).not.toHaveProperty("buyerId");
    expect(detail.items[0].quantity).toBe(2);
  });
});

describe("buyer order access", () => {
  test("GET /orders/me lists my orders", async () => {
    const { orderId } = await placeOrder(m);
    const list = ok<{ id: string }[]>(
      await api("GET", "/orders/me", { token: m.buyer.token }),
    );
    expect(list.map((o) => o.id)).toContain(orderId);
  });

  test("GET /orders/me/:id is 404 for another buyer", async () => {
    const { orderId } = await placeOrder(m);
    const other = await createUser(t);
    expect(
      (await api("GET", `/orders/me/${orderId}`, { token: other.token }))
        .status,
    ).toBe(404);
  });

  test("PATCH /orders/me/:id/cancel cancels and restocks", async () => {
    const before = await stock();
    const { orderId } = await placeOrder(m, 3);
    expect(await stock()).toBe(before - 3);

    ok(
      await api("PATCH", `/orders/me/${orderId}/cancel`, {
        token: m.buyer.token,
      }),
    );
    const detail = ok(
      await api("GET", `/orders/me/${orderId}`, { token: m.buyer.token }),
    );
    expect(detail.order.status).toBe("cancelled");
    expect(await stock()).toBe(before);
  });

  test("cancelling a shipped order is refused", async () => {
    const { orderId } = await placeOrder(m);
    ok(
      await api("PATCH", `/orders/admin/${orderId}/status`, {
        token: m.admin.token,
        body: { status: "shipped" },
      }),
    );
    const res = await api("PATCH", `/orders/me/${orderId}/cancel`, {
      token: m.buyer.token,
    });
    expect(res.status).toBe(400);
  });

  test("cancel is 404 for an unknown order", async () => {
    const res = await api("PATCH", `/orders/me/${missingId()}/cancel`, {
      token: m.buyer.token,
    });
    expect(res.status).toBe(404);
  });
});

describe("store accounts", () => {
  test("have no order routes any more", async () => {
    for (const path of ["/orders/seller/items", "/orders/seller/stats"])
      expect(
        (await api("GET", path, { token: otherSeller.token })).status,
      ).toBe(404);
  });
});

describe("admin orders", () => {
  test("GET /orders/admin/status/:status", async () => {
    const { orderId } = await placeOrder(m);
    const list = ok<{ id: string }[]>(
      await api("GET", "/orders/admin/status/pending", {
        token: m.admin.token,
      }),
    );
    expect(list.map((o) => o.id)).toContain(orderId);
  });

  test("GET /orders/admin/payment-status/:status", async () => {
    const { orderId } = await placeOrder(m);
    const list = ok<{ id: string }[]>(
      await api("GET", "/orders/admin/payment-status/pending", {
        token: m.admin.token,
      }),
    );
    expect(list.map((o) => o.id)).toContain(orderId);
  });

  test("PATCH /orders/admin/:id/status sets the order status", async () => {
    const { orderId } = await placeOrder(m);
    ok(
      await api("PATCH", `/orders/admin/${orderId}/status`, {
        token: m.admin.token,
        body: { status: "processing" },
      }),
    );
    const detail = ok(
      await api("GET", `/orders/me/${orderId}`, { token: m.buyer.token }),
    );
    expect(detail.order.status).toBe("processing");
  });

  test("PATCH /orders/admin/:id/status is 404 for unknown orders", async () => {
    const res = await api("PATCH", `/orders/admin/${missingId()}/status`, {
      token: m.admin.token,
      body: { status: "confirmed" },
    });
    expect(res.status).toBe(404);
  });

  test("admin order routes are admin-only", async () => {
    expect(
      (
        await api("GET", "/orders/admin/status/pending", {
          token: m.buyer.token,
        })
      ).status,
    ).toBe(403);
  });
});
