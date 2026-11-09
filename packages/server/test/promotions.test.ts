import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createAddress,
  createSeller,
  createUser,
  missingId,
  ok,
  placeOrder,
  RUN,
  Tracker,
  type Market,
  type TestSeller,
} from "./helpers";

const t = new Tracker();
let m: Market;
// An account from before seller sign-ups closed.
let store: TestSeller;
const code = (name: string) => {
  const c = `${name}-${RUN}`.toUpperCase();
  t.promoCodes.add(c);
  return c;
};

beforeAll(async () => {
  m = await createMarket(t);
  store = await createSeller(t);
});
afterAll(() => t.cleanup());

describe("admin promotion management", () => {
  const SALE = code("SALE");
  let promoId: string;
  const listed = async () =>
    ok<{ id: string; isActive: boolean }[]>(
      await api("GET", "/promotions/admin", { token: m.admin.token }),
    ).find((p) => p.id === promoId);

  beforeAll(async () => {
    promoId = ok<{ id: string }>(
      await api("POST", "/promotions/admin", {
        token: m.admin.token,
        body: { code: SALE, type: "percent", value: "10" },
      }),
      201,
    ).id;
  });

  test("deactivate and activate toggle a code", async () => {
    ok(
      await api("PATCH", `/promotions/admin/${promoId}/deactivate`, {
        token: m.admin.token,
      }),
    );
    expect((await listed())?.isActive).toBe(false);
    ok(
      await api("PATCH", `/promotions/admin/${promoId}/activate`, {
        token: m.admin.token,
      }),
    );
    expect((await listed())?.isActive).toBe(true);
  });

  test("409 for a code that already exists", async () => {
    const res = await api("POST", "/promotions/admin", {
      token: m.admin.token,
      body: { code: SALE, type: "fixed", value: "50" },
    });
    expect(res.status).toBe(409);
  });

  test("404s for unknown promotions", async () => {
    const id = missingId();
    for (const action of ["activate", "deactivate"])
      expect(
        (
          await api("PATCH", `/promotions/admin/${id}/${action}`, {
            token: m.admin.token,
          })
        ).status,
      ).toBe(404);
    expect(
      (await api("DELETE", `/promotions/admin/${id}`, { token: m.admin.token }))
        .status,
    ).toBe(404);
  });

  test("DELETE /promotions/admin/:id removes it", async () => {
    const DOOMED = code("DOOMED");
    const p = ok<{ id: string }>(
      await api("POST", "/promotions/admin", {
        token: m.admin.token,
        body: { code: DOOMED, type: "fixed", value: "10" },
      }),
      201,
    );
    ok(
      await api("DELETE", `/promotions/admin/${p.id}`, {
        token: m.admin.token,
      }),
    );
    const list = ok<{ id: string }[]>(
      await api("GET", "/promotions/admin", { token: m.admin.token }),
    );
    expect(list.map((x) => x.id)).not.toContain(p.id);
  });

  test("stores can't run promotions any more", async () => {
    expect(
      (await api("GET", "/promotions/seller", { token: store.token })).status,
    ).toBe(404);
    for (const [method, path] of [
      ["PATCH", `/promotions/admin/${promoId}/deactivate`],
      ["DELETE", `/promotions/admin/${promoId}`],
    ])
      expect((await api(method, path, { token: store.token })).status).toBe(
        403,
      );
  });
});

describe("platform promotions", () => {
  const WELCOME = code("WELCOME");

  test("POST /promotions/admin creates a platform-wide code", async () => {
    const p = ok(
      await api("POST", "/promotions/admin", {
        token: m.admin.token,
        body: {
          code: WELCOME,
          type: "fixed",
          value: "200",
          minOrderAmount: "500",
        },
      }),
      201,
    );
    expect(p.sellerId).toBeNull();
  });

  test("GET /promotions/admin lists platform codes", async () => {
    const list = ok<{ code: string }[]>(
      await api("GET", "/promotions/admin", { token: m.admin.token }),
    );
    expect(list.map((p) => p.code)).toContain(WELCOME);
  });

  test("platform promotion routes are admin-only", async () => {
    expect(
      (await api("GET", "/promotions/admin", { token: m.buyer.token })).status,
    ).toBe(403);
  });

  test("POST /promotions/preview prices a valid code without a login", async () => {
    const preview = ok(
      await api("POST", "/promotions/preview", {
        body: { code: WELCOME, orderAmount: 1000 },
      }),
    );
    expect(preview.discount).toBe(200);
    expect(preview.finalAmount).toBe(800);
  });

  test("preview enforces the minimum order", async () => {
    const res = await api("POST", "/promotions/preview", {
      body: { code: WELCOME, orderAmount: 100 },
    });
    expect(res.status).toBe(400);
  });

  test("preview is 404 for unknown codes", async () => {
    const res = await api("POST", "/promotions/preview", {
      body: { code: `NOPE-${RUN}`, orderAmount: 1000 },
    });
    expect(res.status).toBe(404);
  });

  test("preview rejects an expired code", async () => {
    const OLD = code("OLD");
    ok(
      await api("POST", "/promotions/admin", {
        token: m.admin.token,
        body: {
          code: OLD,
          type: "percent",
          value: "5",
          expiresAt: "2020-01-01",
        },
      }),
      201,
    );
    const res = await api("POST", "/promotions/preview", {
      body: { code: OLD, orderAmount: 1000 },
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });
});

describe("promo codes at checkout", () => {
  const addToCart = async (token: string, quantity = 1) =>
    ok(
      await api("POST", "/cart", {
        token,
        body: { productVariantId: m.product.variantId, quantity },
      }),
      201,
    );
  const checkout = (token: string, addressId: string, promotionCode?: string) =>
    api("POST", "/orders/me", {
      token,
      body: { deliveryAddressId: addressId, promotionCode },
    });
  const newBuyer = async () => {
    const u = await createUser(t, "promo");
    const a = await createAddress(u, m.zone.county);
    return { u, a };
  };
  const promo = async (name: string, body: object) => {
    const c = code(name);
    ok(
      await api("POST", "/promotions/admin", {
        token: m.admin.token,
        body: { code: c, ...body },
      }),
      201,
    );
    return c;
  };

  test("the discount comes off what the buyer pays", async () => {
    const c = await promo("TAKE200", { type: "fixed", value: "200" });
    const { u, a } = await newBuyer();
    await addToCart(u.token, 2); // 2 × 1000
    const placed = ok(await checkout(u.token, a.id, c), 201);
    expect(placed.discountAmount).toBe("200.00");
    expect(Number(placed.totalAmount)).toBe(
      2000 - 200 + Number(placed.deliveryFee),
    );
    const detail = ok(
      await api("GET", `/orders/me/${placed.orderId}`, { token: u.token }),
    );
    expect(detail.order.discountAmount).toBe("200.00");
    expect(detail.order.totalAmount).toBe(placed.totalAmount);
  });

  test("a bad code stops checkout and leaves the cart as it was", async () => {
    const { u, a } = await newBuyer();
    await addToCart(u.token);
    const res = await checkout(u.token, a.id, "NO-SUCH-CODE");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PROMO_INVALID");
    const cart = ok(await api("GET", "/cart", { token: u.token }));
    expect(cart).toHaveLength(1);
  });

  test("a one-use code goes to one order, and cancelling gives it back", async () => {
    const c = await promo("ONCE", { type: "percent", value: "10", maxUses: 1 });
    const buyers = [await newBuyer(), await newBuyer()];
    for (const b of buyers) await addToCart(b.u.token);
    const results = await Promise.all(
      buyers.map((b) => checkout(b.u.token, b.a.id, c)),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);

    const winner = buyers[results.findIndex((r) => r.status === 201)]!;
    const loser = buyers[results.findIndex((r) => r.status === 400)]!;
    const placed = results.find((r) => r.status === 201)!.body.data;
    ok(
      await api("PATCH", `/orders/me/${placed.orderId}/cancel`, {
        token: winner.u.token,
      }),
    );
    // The loser's cart was put back; now the code is free again.
    expect((await checkout(loser.u.token, loser.a.id, c)).status).toBe(201);
  });

  test("a double-clicked checkout places one order", async () => {
    const { u, a } = await newBuyer();
    await addToCart(u.token);
    const results = await Promise.all(
      [1, 2, 3].map(() => checkout(u.token, a.id)),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
  });
});

test("a promotion's value must make sense", async () => {
  for (const body of [
    { type: "percent", value: "150" },
    { type: "percent", value: "0" },
    { type: "fixed", value: "-50" },
    { type: "fixed", value: "abc" },
  ]) {
    const res = await api("POST", "/promotions/admin", {
      token: m.admin.token,
      body: { code: code(`BAD${body.value}`.replace(/\W/g, "")), ...body },
    });
    expect(res.status).toBe(400);
  }
});
