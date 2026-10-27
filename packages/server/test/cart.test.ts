import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createProduct,
  createSeller,
  createUser,
  type Market,
  missingId,
  ok,
  type TestUser,
  Tracker,
} from "./helpers";

const t = new Tracker();
let m: Market;
let stranger: TestUser;
let itemId: string;

beforeAll(async () => {
  m = await createMarket(t);
  stranger = await createUser(t);
});
afterAll(() => t.cleanup());

describe("cart", () => {
  test("GET /cart/summary is 404 before a cart exists", async () => {
    const fresh = await createUser(t);
    expect(
      (await api("GET", "/cart/summary", { token: fresh.token })).status,
    ).toBe(404);
  });

  test("GET /cart creates an empty cart on first read", async () => {
    const items = ok<unknown[]>(
      await api("GET", "/cart", { token: m.buyer.token }),
    );
    expect(items).toEqual([]);
    const s = ok(await api("GET", "/cart/summary", { token: m.buyer.token }));
    expect(s.itemCount).toBe(0);
  });

  test("POST /cart adds an item", async () => {
    const item = ok(
      await api("POST", "/cart", {
        token: m.buyer.token,
        body: { productVariantId: m.product.variantId, quantity: 2 },
      }),
      201,
    );
    itemId = item.id;
    expect(item.quantity).toBe(2);
  });

  test("POST /cart again merges into the same line", async () => {
    const item = ok(
      await api("POST", "/cart", {
        token: m.buyer.token,
        body: { productVariantId: m.product.variantId, quantity: 1 },
      }),
      201,
    );
    expect(item.id).toBe(itemId);
    expect(item.quantity).toBe(3);
  });

  test("GET /cart/summary totals live prices", async () => {
    const s = ok(await api("GET", "/cart/summary", { token: m.buyer.token }));
    expect(s.itemCount).toBe(3);
    expect(Number(s.subtotal)).toBe(m.product.price * 3);
  });

  test("POST /cart rejects more than the stock", async () => {
    const res = await api("POST", "/cart", {
      token: m.buyer.token,
      body: { productVariantId: m.product.variantId, quantity: 50 },
    });
    expect(res.status).toBe(400);
  });

  test("POST /cart refuses an older store's account its own listing", async () => {
    const store = await createSeller(t);
    const own = await createProduct(t, m.admin, m.category.id, { store });
    const res = await api("POST", "/cart", {
      token: store.token,
      body: { productVariantId: own.variantId, quantity: 1 },
    });
    expect(res.status).toBe(403);
  });

  test("POST /cart is 404 for an unknown variant", async () => {
    const res = await api("POST", "/cart", {
      token: m.buyer.token,
      body: { productVariantId: missingId() },
    });
    expect(res.status).toBe(404);
  });

  test("PATCH /cart/:id/quantity sets the quantity", async () => {
    ok(
      await api("PATCH", `/cart/${itemId}/quantity`, {
        token: m.buyer.token,
        body: { quantity: 5 },
      }),
    );
    const items = ok<{ quantity: number }[]>(
      await api("GET", "/cart", { token: m.buyer.token }),
    );
    expect(items[0].quantity).toBe(5);
  });

  test("PATCH /cart/:id/quantity rejects more than the stock", async () => {
    const res = await api("PATCH", `/cart/${itemId}/quantity`, {
      token: m.buyer.token,
      body: { quantity: 99 },
    });
    expect(res.status).toBe(400);
  });

  test("PATCH /cart/:id/adjust changes it by a delta", async () => {
    ok(
      await api("PATCH", `/cart/${itemId}/adjust`, {
        token: m.buyer.token,
        body: { delta: -2 },
      }),
    );
    const s = ok(await api("GET", "/cart/summary", { token: m.buyer.token }));
    expect(s.itemCount).toBe(3);
  });

  test("another user can't touch my cart item", async () => {
    ok(
      await api("POST", "/cart", {
        token: stranger.token,
        body: { productVariantId: m.product.variantId },
      }),
      201,
    );
    const res = await api("PATCH", `/cart/${itemId}/quantity`, {
      token: stranger.token,
      body: { quantity: 1 },
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /cart/:id removes the line", async () => {
    ok(await api("DELETE", `/cart/${itemId}`, { token: m.buyer.token }));
    const items = ok<unknown[]>(
      await api("GET", "/cart", { token: m.buyer.token }),
    );
    expect(items).toEqual([]);
  });

  test("DELETE /cart clears everything", async () => {
    ok(
      await api("POST", "/cart", {
        token: m.buyer.token,
        body: { productVariantId: m.product.variantId },
      }),
      201,
    );
    ok(await api("DELETE", "/cart", { token: m.buyer.token }));
    const items = ok<unknown[]>(
      await api("GET", "/cart", { token: m.buyer.token }),
    );
    expect(items).toEqual([]);
  });

  test("cart routes need a token", async () => {
    for (const [method, path] of [
      ["GET", "/cart"],
      ["GET", "/cart/summary"],
      ["DELETE", "/cart"],
    ]) {
      expect((await api(method, path)).status).toBe(401);
    }
  });
});
