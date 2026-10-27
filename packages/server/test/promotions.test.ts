import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createSeller,
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

  test("POST /promotions/me/apply applies a code to my order", async () => {
    const { orderId } = await placeOrder(m);
    const applied = ok(
      await api("POST", "/promotions/me/apply", {
        token: m.buyer.token,
        body: { orderId, code: WELCOME },
      }),
    );
    expect(applied.discount).toBe(200);
  });

  test("apply is 404 for another buyer's order", async () => {
    const { orderId } = await placeOrder(m);
    const res = await api("POST", "/promotions/me/apply", {
      token: store.token,
      body: { orderId, code: WELCOME },
    });
    expect(res.status).toBe(404);
  });
});
