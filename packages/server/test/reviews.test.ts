import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createUser,
  missingId,
  deliverOrder,
  ok,
  placeOrder,
  placePaidOrder,
  Tracker,
  type Market,
} from "./helpers";

const t = new Tracker();
let m: Market;
let deliveredItemId: string;
let reviewId: string;

/** Places, pays and delivers an order through the hub. */
async function deliveredItem() {
  const placed = await placePaidOrder(m);
  await deliverOrder(m, placed);
  return placed.orderItemId;
}

beforeAll(async () => {
  m = await createMarket(t);
  deliveredItemId = await deliveredItem();
});
afterAll(() => t.cleanup());

describe("POST /reviews/me", () => {
  test("reviews a delivered item", async () => {
    const res = await api("POST", "/reviews/me", {
      token: m.buyer.token,
      body: {
        orderItemId: deliveredItemId,
        rating: 4,
        comment: "Good product",
      },
    });
    expect(res.status).toBe(201);
    const mine = ok<{ id: string; productId: string; sellerId: string }[]>(
      await api("GET", "/reviews/me", { token: m.buyer.token }),
    );
    expect(mine).toHaveLength(1);
    reviewId = mine[0].id;
    expect(mine[0].productId).toBe(m.product.id);
    expect(mine[0]).not.toHaveProperty("sellerId");
    expect(mine[0]).not.toHaveProperty("reviewerId");
  });

  test("updates the store's rating, shown on the product page", async () => {
    const page = ok<{ seller: { rating: string } | null }>(
      await api("GET", `/products/by-slug/${m.product.slug}`),
    );
    expect(Number(page.seller?.rating)).toBeGreaterThan(0);
  });

  test("409 when reviewing the same item twice", async () => {
    const res = await api("POST", "/reviews/me", {
      token: m.buyer.token,
      body: { orderItemId: deliveredItemId, rating: 5 },
    });
    expect(res.status).toBe(409);
  });

  test("400 for items that aren't delivered yet", async () => {
    const { orderItemId } = await placeOrder(m);
    const res = await api("POST", "/reviews/me", {
      token: m.buyer.token,
      body: { orderItemId, rating: 5 },
    });
    expect(res.status).toBe(400);
  });

  test("404 for someone else's order item", async () => {
    const itemId = await deliveredItem();
    const other = await createUser(t);
    const res = await api("POST", "/reviews/me", {
      token: other.token,
      body: { orderItemId: itemId, rating: 5 },
    });
    expect(res.status).toBe(404);
  });

  test("400 for a rating outside 1–5", async () => {
    const res = await api("POST", "/reviews/me", {
      token: m.buyer.token,
      body: { orderItemId: deliveredItemId, rating: 6 },
    });
    expect(res.status).toBe(400);
  });
});

describe("public review reads", () => {
  test("GET /reviews/product/:id lists the product's reviews", async () => {
    const list = ok<{ id: string }[]>(
      await api("GET", `/reviews/product/${m.product.id}`),
    );
    expect(list.map((r) => r.id)).toContain(reviewId);
  });

  test("GET /reviews/product/:id/rating averages them", async () => {
    const { averageRating } = ok(
      await api("GET", `/reviews/product/${m.product.id}/rating`),
    );
    expect(Number(averageRating)).toBe(4);
  });

  test("there are no per-store review routes (stores are anonymous)", async () => {
    for (const path of [
      `/reviews/seller/${missingId()}`,
      `/reviews/seller/${missingId()}/rating`,
    ])
      expect((await api("GET", path)).status).toBe(404);
  });

  test("a product with no reviews has an empty list", async () => {
    expect(
      ok<unknown[]>(await api("GET", `/reviews/product/${missingId()}`)),
    ).toEqual([]);
  });
});

describe("editing reviews", () => {
  test("PATCH /reviews/me/:id updates the comment", async () => {
    ok(
      await api("PATCH", `/reviews/me/${reviewId}`, {
        token: m.buyer.token,
        body: { comment: "Even better after a week" },
      }),
    );
    const mine = ok<{ comment: string }[]>(
      await api("GET", "/reviews/me", { token: m.buyer.token }),
    );
    expect(mine[0].comment).toBe("Even better after a week");
  });

  test("another user can't edit my review", async () => {
    const other = await createUser(t);
    const res = await api("PATCH", `/reviews/me/${reviewId}`, {
      token: other.token,
      body: { comment: "Hijacked" },
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /reviews/me/:id removes my review", async () => {
    ok(
      await api("DELETE", `/reviews/me/${reviewId}`, { token: m.buyer.token }),
    );
    expect(
      ok<unknown[]>(await api("GET", "/reviews/me", { token: m.buyer.token })),
    ).toEqual([]);
  });

  test("DELETE /reviews/admin/:id removes any review (admin-only)", async () => {
    const itemId = await deliveredItem();
    expect(
      (
        await api("POST", "/reviews/me", {
          token: m.buyer.token,
          body: { orderItemId: itemId, rating: 2 },
        })
      ).status,
    ).toBe(201);
    const [review] = ok<{ id: string }[]>(
      await api("GET", "/reviews/me", { token: m.buyer.token }),
    );
    expect(
      (
        await api("DELETE", `/reviews/admin/${review.id}`, {
          token: m.buyer.token,
        })
      ).status,
    ).toBe(403);
    ok(
      await api("DELETE", `/reviews/admin/${review.id}`, {
        token: m.admin.token,
      }),
    );
    expect(
      ok<unknown[]>(await api("GET", "/reviews/me", { token: m.buyer.token })),
    ).toEqual([]);
  });

  test("deleting an unknown review is 404", async () => {
    expect(
      (
        await api("DELETE", `/reviews/me/${missingId()}`, {
          token: m.buyer.token,
        })
      ).status,
    ).toBe(404);
  });
});

describe("keeping deals on Soko", () => {
  test("POST /reviews/me rejects contact details in the comment", async () => {
    const itemId = await deliveredItem();
    const res = await api("POST", "/reviews/me", {
      token: m.buyer.token,
      body: {
        orderItemId: itemId,
        rating: 5,
        comment: "Text me on 0712345678",
      },
    });
    expect(res.status).toBe(400);
  });
});
