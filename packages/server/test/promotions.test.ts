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
let otherSeller: TestSeller;
const code = (name: string) => {
  const c = `${name}-${RUN}`.toUpperCase();
  t.promoCodes.add(c);
  return c;
};

beforeAll(async () => {
  m = await createMarket(t);
  otherSeller = await createSeller(t);
});
afterAll(() => t.cleanup());

describe("seller promotions", () => {
  let promoId: string;
  const SAVE10 = code("SAVE10");

  test("POST /promotions/seller creates a code", async () => {
    const p = ok(
      await api("POST", "/promotions/seller", {
        token: m.seller.token,
        body: { code: SAVE10, type: "percent", value: "10", maxUses: 5 },
      }),
      201,
    );
    promoId = p.id;
    expect(p.isActive).toBe(true);
  });

  test("409 for a code that already exists", async () => {
    const res = await api("POST", "/promotions/seller", {
      token: otherSeller.token,
      body: { code: SAVE10, type: "fixed", value: "50" },
    });
    expect(res.status).toBe(409);
  });

  test("GET /promotions/seller lists only my codes", async () => {
    const mine = ok<{ id: string }[]>(
      await api("GET", "/promotions/seller", { token: m.seller.token }),
    );
    expect(mine.map((p) => p.id)).toContain(promoId);
    const theirs = ok<{ id: string }[]>(
      await api("GET", "/promotions/seller", { token: otherSeller.token }),
    );
    expect(theirs.map((p) => p.id)).not.toContain(promoId);
  });

  test("PATCH /promotions/seller/:id updates it", async () => {
    const p = ok(
      await api("PATCH", `/promotions/seller/${promoId}`, {
        token: m.seller.token,
        body: { value: "15" },
      }),
    );
    expect(Number(p.value)).toBe(15);
  });

  test("another seller can't update, toggle or delete it", async () => {
    const res = await api("PATCH", `/promotions/seller/${promoId}`, {
      token: otherSeller.token,
      body: { value: "99" },
    });
    expect(res.status).toBe(404);
    for (const action of ["activate", "deactivate"]) {
      const r = await api("PATCH", `/promotions/seller/${promoId}/${action}`, {
        token: otherSeller.token,
      });
      expect(r.status).toBe(404);
    }
    const del = await api("DELETE", `/promotions/seller/${promoId}`, {
      token: otherSeller.token,
    });
    expect(del.status).toBe(404);

    // Still intact for the owner.
    const mine = ok<{ id: string; value: string; isActive: boolean }[]>(
      await api("GET", "/promotions/seller", { token: m.seller.token }),
    );
    const p = mine.find((x) => x.id === promoId);
    expect(Number(p?.value)).toBe(15);
    expect(p?.isActive).toBe(true);
  });

  test("an expiry date can be set", async () => {
    const p = ok(
      await api("POST", "/promotions/seller", {
        token: m.seller.token,
        body: {
          code: code("DATED"),
          type: "fixed",
          value: "30",
          expiresAt: "2099-12-31",
        },
      }),
      201,
    );
    expect(new Date(p.expiresAt).getUTCFullYear()).toBe(2099);
  });

  test("deactivate and activate toggle it", async () => {
    ok(
      await api("PATCH", `/promotions/seller/${promoId}/deactivate`, {
        token: m.seller.token,
      }),
    );
    let mine = ok<{ id: string; isActive: boolean }[]>(
      await api("GET", "/promotions/seller", { token: m.seller.token }),
    );
    expect(mine.find((p) => p.id === promoId)?.isActive).toBe(false);

    ok(
      await api("PATCH", `/promotions/seller/${promoId}/activate`, {
        token: m.seller.token,
      }),
    );
    mine = ok(
      await api("GET", "/promotions/seller", { token: m.seller.token }),
    );
    expect(mine.find((p) => p.id === promoId)?.isActive).toBe(true);
  });

  test("DELETE /promotions/seller/:id removes it", async () => {
    const p = ok(
      await api("POST", "/promotions/seller", {
        token: m.seller.token,
        body: { code: code("TEMP"), type: "fixed", value: "20" },
      }),
      201,
    );
    ok(
      await api("DELETE", `/promotions/seller/${p.id}`, {
        token: m.seller.token,
      }),
    );
    const mine = ok<{ id: string }[]>(
      await api("GET", "/promotions/seller", { token: m.seller.token }),
    );
    expect(mine.map((x) => x.id)).not.toContain(p.id);
  });

  test("404s for unknown promotions", async () => {
    const id = missingId();
    for (const path of [
      `/promotions/seller/${id}/activate`,
      `/promotions/seller/${id}/deactivate`,
    ]) {
      expect((await api("PATCH", path, { token: m.seller.token })).status).toBe(
        404,
      );
    }
    expect(
      (
        await api("DELETE", `/promotions/seller/${id}`, {
          token: m.seller.token,
        })
      ).status,
    ).toBe(404);
  });

  test("seller promotion routes are seller-only", async () => {
    expect(
      (await api("GET", "/promotions/seller", { token: m.buyer.token })).status,
    ).toBe(403);
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

  test("sellers can't modify platform codes", async () => {
    const list = ok<{ id: string; code: string }[]>(
      await api("GET", "/promotions/admin", { token: m.admin.token }),
    );
    const platform = list.find((p) => p.code === WELCOME)!;
    const res = await api(
      "PATCH",
      `/promotions/seller/${platform.id}/deactivate`,
      {
        token: m.seller.token,
      },
    );
    expect(res.status).toBe(404);
  });

  test("platform promotion routes are admin-only", async () => {
    expect(
      (await api("GET", "/promotions/admin", { token: m.seller.token })).status,
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
      token: m.seller.token,
      body: { orderId, code: WELCOME },
    });
    expect(res.status).toBe(404);
  });
});
