import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createMarket,
  createProduct,
  ok,
  Tracker,
  type Market,
} from "./helpers";

const t = new Tracker();
let m: Market;

interface Suggestions {
  products: {
    name: string;
    slug: string;
    price: string | null;
    image: string | null;
  }[];
  categories: { name: string; slug: string }[];
}

const suggest = async (q: string) =>
  ok<Suggestions>(
    await api("GET", `/search/suggest?q=${encodeURIComponent(q)}`),
  );

beforeAll(async () => {
  m = await createMarket(t);
});
afterAll(() => t.cleanup());

describe("search suggestions", () => {
  test("matches product names case-insensitively, with price and image", async () => {
    const s = await suggest(m.product.slug.toUpperCase());
    const hit = s.products.find((p) => p.slug === m.product.slug);
    expect(hit).toBeDefined();
    expect(Number(hit!.price)).toBe(m.product.price);
    expect(hit!.image).toContain("picsum.photos");
  });

  test("never suggests stores (they're anonymous)", async () => {
    const s = await suggest("test store");
    expect(s).not.toHaveProperty("stores");
  });

  test("leaves out drafts", async () => {
    const draft = await createProduct(t, m.admin, m.category.id, {
      publish: false,
    });
    const s = await suggest(draft.slug);
    expect(s.products.some((p) => p.slug === draft.slug)).toBe(false);
  });

  test("treats LIKE wildcards literally", async () => {
    const s = await suggest("%");
    expect(s.products).toEqual([]);
    expect(s.categories).toEqual([]);
  });

  test("returns empty lists for an empty query", async () => {
    expect(await suggest("   ")).toEqual({ products: [], categories: [] });
  });
});
