import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createAdmin,
  createSeller,
  createUser,
  login,
  ok,
  RUN,
  Tracker,
  type TestSeller,
  type TestUser,
} from "./helpers";
import { getRepositories } from "../src/lib/repositories";

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

const storeOf = async (s: TestSeller) => {
  const store =
    await getRepositories().sellerProfileRepository.findSellerProfileById(
      s.sellerId,
    );
  if (store === "seller_not_found") throw new Error("store missing");
  return store;
};

describe("seller sign-ups are closed", () => {
  test("there's no way to open a store", async () => {
    const res = await api("POST", "/sellers/onboard", {
      token: buyer.token,
      body: { storeName: "New Store", storeSlug: `new-${RUN}` },
    });
    expect(res.status).toBe(404);
    expect((await login(buyer.email)).user.role).toBe("buyer");
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

describe("existing store accounts", () => {
  test("have no store self-service any more", async () => {
    for (const [method, path, body] of [
      ["GET", "/sellers/me"],
      ["PATCH", "/sellers/me", { storeDescription: "x" }],
      [
        "POST",
        "/sellers/me/verification-docs",
        { docUrl: "https://x.test/a.pdf" },
      ],
      ["DELETE", "/sellers/me"],
    ] as [string, string, unknown?][])
      expect(
        (await api(method, path, { token: seller.token, body })).status,
      ).toBe(404);
  });
});

describe("admin: sellers", () => {
  test("PATCH /sellers/admin/:userId/verify marks the store verified", async () => {
    ok(
      await api("PATCH", `/sellers/admin/${seller.id}/verify`, {
        token: admin.token,
      }),
    );
    expect((await storeOf(seller)).isVerified).toBe(true);
  });

  test("PATCH /sellers/admin/:userId/rating sets the rating", async () => {
    ok(
      await api("PATCH", `/sellers/admin/${seller.id}/rating`, {
        token: admin.token,
        body: { rating: "4.50" },
      }),
    );
    expect(Number((await storeOf(seller)).rating)).toBe(4.5);
  });

  test("DELETE /sellers/admin/:userId removes the store", async () => {
    const s = await createSeller(t);
    ok(await api("DELETE", `/sellers/admin/${s.id}`, { token: admin.token }));
    expect(
      await getRepositories().sellerProfileRepository.findSellerProfileById(
        s.sellerId,
      ),
    ).toBe("seller_not_found");
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
