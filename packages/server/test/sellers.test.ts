import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createAdmin,
  createSeller,
  createUser,
  login,
  missingId,
  ok,
  RUN,
  Tracker,
  type TestSeller,
  type TestUser,
} from "./helpers";

const t = new Tracker();
let admin: TestUser;
let seller: TestSeller;
let buyer: TestUser;

beforeAll(async () => {
  admin = await createAdmin(t);
  seller = await createSeller(t);
  buyer = await createUser(t);
});
afterAll(() => t.cleanup());

describe("POST /sellers/onboard", () => {
  test("opens a store and upgrades the role", async () => {
    const u = await createUser(t);
    const slug = `onboard-${RUN}`;
    const profile = ok(
      await api("POST", "/sellers/onboard", {
        token: u.token,
        body: {
          storeName: "Onboard Store",
          storeSlug: slug,
          storeDescription: "Hi",
        },
      }),
      201,
    );
    expect(profile.storeSlug).toBe(slug);
    expect(profile.userId).toBe(u.id);
    expect((await login(u.email)).user.role).toBe("seller");
  });

  test("409 when the user already has a store", async () => {
    const res = await api("POST", "/sellers/onboard", {
      token: seller.token,
      body: { storeName: "Second", storeSlug: `second-${RUN}` },
    });
    expect(res.status).toBe(409);
  });

  test("409 when the slug is taken", async () => {
    const u = await createUser(t);
    const res = await api("POST", "/sellers/onboard", {
      token: u.token,
      body: { storeName: "Copycat", storeSlug: seller.storeSlug },
    });
    expect(res.status).toBe(409);
  });

  test("401 without a token", async () => {
    const res = await api("POST", "/sellers/onboard", {
      body: { storeName: "Anon", storeSlug: `anon-${RUN}` },
    });
    expect(res.status).toBe(401);
  });
});

describe("public store lookups", () => {
  test("there are no lookups by store id (stores are anonymous)", async () => {
    for (const path of [
      `/sellers/by-id/${seller.sellerId}`,
      `/products/by-seller/${seller.sellerId}`,
    ])
      expect((await api("GET", path)).status).toBe(404);
  });

  test("there's no public storefront by slug", async () => {
    expect((await api("GET", `/sellers/${seller.storeSlug}`)).status).toBe(404);
  });
});

describe("seller profile", () => {
  test("GET /sellers/me returns my store", async () => {
    const me = ok(await api("GET", "/sellers/me", { token: seller.token }));
    expect(me.id).toBe(seller.sellerId);
  });

  test("GET /sellers/me is seller-only", async () => {
    expect(
      (await api("GET", "/sellers/me", { token: buyer.token })).status,
    ).toBe(403);
  });

  test("PATCH /sellers/me updates the store", async () => {
    const updated = ok(
      await api("PATCH", "/sellers/me", {
        token: seller.token,
        body: { storeDescription: "Updated by tests" },
      }),
    );
    expect(updated.storeDescription).toBe("Updated by tests");
  });

  test("PATCH /sellers/me rejects a taken slug", async () => {
    const other = await createSeller(t);
    const res = await api("PATCH", "/sellers/me", {
      token: other.token,
      body: { storeSlug: seller.storeSlug },
    });
    expect(res.status).toBe(409);
  });

  test("POST /sellers/me/verification-docs stores the document privately", async () => {
    ok(
      await api("POST", "/sellers/me/verification-docs", {
        token: seller.token,
        body: { docUrl: "https://example.com/kra.pdf" },
      }),
    );
    const me = ok(await api("GET", "/sellers/me", { token: seller.token }));
    expect(me.verificationDocs).toContain("https://example.com/kra.pdf");
  });

  test("DELETE /sellers/me closes the store", async () => {
    const s = await createSeller(t);
    ok(await api("DELETE", "/sellers/me", { token: s.token }));
    expect([403, 404]).toContain(
      (await api("GET", "/sellers/me", { token: s.token })).status,
    );
  });
});

describe("admin: sellers", () => {
  test("PATCH /sellers/admin/:userId/verify marks the store verified", async () => {
    ok(
      await api("PATCH", `/sellers/admin/${seller.id}/verify`, {
        token: admin.token,
      }),
    );
    const store = ok(await api("GET", "/sellers/me", { token: seller.token }));
    expect(store.isVerified).toBe(true);
  });

  test("PATCH /sellers/admin/:userId/rating sets the rating", async () => {
    ok(
      await api("PATCH", `/sellers/admin/${seller.id}/rating`, {
        token: admin.token,
        body: { rating: "4.50" },
      }),
    );
    const store = ok(await api("GET", "/sellers/me", { token: seller.token }));
    expect(Number(store.rating)).toBe(4.5);
  });

  test("DELETE /sellers/admin/:userId removes the store", async () => {
    const s = await createSeller(t);
    ok(await api("DELETE", `/sellers/admin/${s.id}`, { token: admin.token }));
    expect([403, 404]).toContain(
      (await api("GET", "/sellers/me", { token: s.token })).status,
    );
  });

  test("404 for users without a store", async () => {
    const res = await api("PATCH", `/sellers/admin/${buyer.id}/verify`, {
      token: admin.token,
    });
    expect(res.status).toBe(404);
  });

  test("admin seller routes reject sellers", async () => {
    for (const [method, path, body] of [
      ["PATCH", `/sellers/admin/${seller.id}/verify`],
      ["PATCH", `/sellers/admin/${seller.id}/rating`, { rating: "5.00" }],
      ["DELETE", `/sellers/admin/${seller.id}`],
    ] as [string, string, unknown?][]) {
      expect(
        (await api(method, path, { token: seller.token, body })).status,
      ).toBe(403);
    }
  });
});
