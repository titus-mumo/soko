import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createCategory,
  createMarket,
  createProduct,
  ok,
  placeOrder,
  placePaidOrder,
  Tracker,
  type Market,
} from "./helpers";

// Lists come back a page at a time: `data` is the page, `nextCursor` fetches
// the next one (null on the last page).

const t = new Tracker();
let m: Market;
let category: { id: string; slug: string };
const prices = [500, 1500, 250, 4000, 1000];

beforeAll(async () => {
  m = await createMarket(t);
  // A category of our own, so the catalogue tests see only these.
  category = await createCategory(t, m.admin);
  for (const price of prices)
    await createProduct(m.seller, category.id, { price });
});
afterAll(() => t.cleanup());

type Card = {
  id: string;
  slug: string;
  price: string;
  image: string | null;
  soldOut: boolean;
  variantId: string | null;
};

/** Follows nextCursor to the end; returns every item and the page count. */
async function walk<T>(path: string, token?: string) {
  const all: T[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const res = await api(
      "GET",
      cursor ? `${path}${sep}cursor=${encodeURIComponent(cursor)}` : path,
      { token },
    );
    expect(res.status).toBe(200);
    all.push(...(res.body.data as T[]));
    cursor = res.body.nextCursor;
    pages += 1;
  } while (cursor && pages < 50);
  return { all, pages };
}

describe("GET /products (catalogue)", () => {
  test("pages through a category without repeats or gaps", async () => {
    const { all, pages } = await walk<Card>(
      `/products?category=${category.slug}&limit=2`,
    );
    expect(pages).toBe(3);
    expect(all).toHaveLength(prices.length);
    expect(new Set(all.map((p) => p.id)).size).toBe(prices.length);
  });

  test("items are card-ready: price, image, availability", async () => {
    const res = ok<Card[]>(
      await api("GET", `/products?category=${category.slug}&limit=1`),
    );
    expect(Number(res[0].price)).toBeGreaterThan(0);
    expect(res[0].image).toContain("picsum.photos");
    expect(res[0].soldOut).toBe(false);
    expect(res[0].variantId).toBeTruthy();
    // Card-only: no store id, stock count or internals.
    for (const key of [
      "sellerId",
      "categoryId",
      "createdAt",
      "available",
      "variantCount",
    ])
      expect(res[0]).not.toHaveProperty(key);
  });

  test("sorts by price across pages, both ways", async () => {
    const up = await walk<Card>(
      `/products?category=${category.slug}&sort=price_asc&limit=2`,
    );
    expect(up.all.map((p) => Number(p.price))).toEqual(
      [...prices].sort((a, b) => a - b),
    );
    const down = await walk<Card>(
      `/products?category=${category.slug}&sort=price_desc&limit=2`,
    );
    expect(down.all.map((p) => Number(p.price))).toEqual(
      [...prices].sort((a, b) => b - a),
    );
  });

  test("searches by name", async () => {
    const one = (await walk<Card>(`/products?category=${category.slug}`))
      .all[0];
    const found = ok<Card[]>(
      await api("GET", `/products?q=${encodeURIComponent(one.slug)}`),
    );
    expect(found.map((p) => p.id)).toContain(one.id);
  });

  test("an unknown category is 404", async () => {
    expect(
      (await api("GET", "/products?category=no-such-category")).status,
    ).toBe(404);
  });

  test("a bad cursor starts from the first page; limits are capped", async () => {
    const res = await api(
      "GET",
      `/products?category=${category.slug}&cursor=garbage&limit=9999`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(prices.length);
    expect(res.body.nextCursor).toBeNull();
  });

  test("GET /products/stats counts live listings and stores", async () => {
    const stats = ok<{ products: number; sellers: number }>(
      await api("GET", "/products/stats"),
    );
    expect(stats.products).toBeGreaterThanOrEqual(prices.length);
    expect(stats.sellers).toBeGreaterThanOrEqual(1);
  });
});

describe("paged account lists", () => {
  test("GET /orders/me pages, newest first", async () => {
    const placed = [];
    for (let i = 0; i < 3; i++) placed.push((await placeOrder(m)).orderId);

    const first = await api("GET", "/orders/me?limit=2", {
      token: m.buyer.token,
    });
    expect(first.body.data).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();
    // Newest first: the last order placed leads.
    expect(first.body.data[0].id).toBe(placed[2]);

    const { all } = await walk<{ id: string }>(
      "/orders/me?limit=2",
      m.buyer.token,
    );
    for (const id of placed) expect(all.map((o) => o.id)).toContain(id);
  });

  test("GET /orders/me?status= filters on the server", async () => {
    const { all } = await walk<{ status: string }>(
      "/orders/me?status=pending&limit=2",
      m.buyer.token,
    );
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((o) => o.status === "pending")).toBe(true);
    const none = await api("GET", "/orders/me?status=delivered", {
      token: m.buyer.token,
    });
    expect(none.body.data).toHaveLength(0);
    const bad = await api("GET", "/orders/me?status=bogus", {
      token: m.buyer.token,
    });
    expect(bad.status).toBe(400);
  });

  test("GET /orders/me/stats counts orders (not swallowed by /me/:orderId)", async () => {
    const stats = ok<{ total: number; active: number }>(
      await api("GET", "/orders/me/stats", { token: m.buyer.token }),
    );
    expect(stats.total).toBeGreaterThanOrEqual(3);
    expect(stats.active).toBeGreaterThanOrEqual(3);
  });

  test("GET /notifications/me pages", async () => {
    const { all, pages } = await walk<{ id: string }>(
      "/notifications/me?limit=1",
      m.buyer.token,
    );
    expect(pages).toBeGreaterThan(1);
    expect(new Set(all.map((n) => n.id)).size).toBe(all.length);
  });

  test("GET /orders/seller/items pages", async () => {
    const { all } = await walk<{ id: string }>(
      "/orders/seller/items?limit=2",
      m.seller.token,
    );
    expect(all.length).toBeGreaterThanOrEqual(3);
  });

  test("GET /products/me pages and includes units sold", async () => {
    const { all } = await walk<{ id: string; unitsSold: number }>(
      "/products/me?limit=2",
      m.seller.token,
    );
    expect(all.length).toBeGreaterThanOrEqual(prices.length + 1);
    expect(all.every((p) => typeof p.unitsSold === "number")).toBe(true);
  });

  test("GET /products/me items carry their variants and images", async () => {
    const page = await api("GET", "/products/me?limit=100", {
      token: m.seller.token,
    });
    const mine = page.body.data.find(
      (p: { id: string }) => p.id === m.product.id,
    );
    expect(mine.variants.map((v: { id: string }) => v.id)).toContain(
      m.product.variantId,
    );
    expect(Array.isArray(mine.images)).toBe(true);
  });

  test("GET /products/me/:id is the seller's own listing only", async () => {
    const mine = ok<{ id: string }>(
      await api("GET", `/products/me/${m.product.id}`, {
        token: m.seller.token,
      }),
    );
    expect(mine.id).toBe(m.product.id);
    const other = await createMarket(t);
    const res = await api("GET", `/products/me/${m.product.id}`, {
      token: other.seller.token,
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /orders/seller/stats", () => {
  test("computes the dashboard numbers in the database", async () => {
    await placePaidOrder(m);
    const s = ok<{
      countsByStatus: Record<string, number>;
      ordersToday: number;
      toDropOff: number;
      daily: number[];
      revenue: string;
      listings: { active: number; total: number };
    }>(await api("GET", "/orders/seller/stats", { token: m.seller.token }));
    expect(s.countsByStatus.confirmed).toBeGreaterThanOrEqual(1);
    expect(s.toDropOff).toBeGreaterThanOrEqual(1);
    expect(s.ordersToday).toBeGreaterThanOrEqual(1);
    expect(s.daily).toHaveLength(14);
    expect(s.daily[13]).toBeGreaterThan(0);
    expect(s.listings.active).toBeGreaterThanOrEqual(prices.length + 1);
  });

  test("is seller-only", async () => {
    expect(
      (await api("GET", "/orders/seller/stats", { token: m.buyer.token }))
        .status,
    ).toBe(403);
  });
});
