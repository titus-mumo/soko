import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createAddress,
  createMarket,
  createProduct,
  createUser,
  expireCartHolds,
  ok,
  Tracker,
  type Market,
  type TestProduct,
  type TestUser,
} from "./helpers";

// Stock rules: a cart line can't exceed what's available, items in a cart
// are held from other shoppers (for CART_HOLD_MINUTES since last touched),
// and checkout takes stock atomically.

const t = new Tracker();
let m: Market;

beforeAll(async () => {
  m = await createMarket(t);
});
afterAll(() => t.cleanup());

const add = (user: TestUser, variantId: string, quantity = 1) =>
  api("POST", "/cart", {
    token: user.token,
    body: { productVariantId: variantId, quantity },
  });

const available = async (p: TestProduct) => {
  const variants = ok<{ id: string; availableQuantity: number }[]>(
    await api("GET", `/products/${p.id}/variants`),
  );
  return variants.find((v) => v.id === p.variantId)!.availableQuantity;
};

const cartLine = async (user: TestUser, variantId: string) => {
  const items = ok<
    {
      id: string;
      productVariantId: string;
      quantity: number;
      availableQuantity: number;
    }[]
  >(await api("GET", "/cart", { token: user.token }));
  return items.find((i) => i.productVariantId === variantId);
};

/** A fresh product with `stock` units and two fresh shoppers. */
async function scene(stock: number) {
  const product = await createProduct(m.seller, m.category.id, { stock });
  const a = await createUser(t, "buyer");
  const b = await createUser(t, "buyer");
  return { product, a, b };
}

describe("cart quantity limits", () => {
  test("with one left, a second unit is refused", async () => {
    const { product, a } = await scene(1);
    ok(await add(a, product.variantId), 201);
    const again = await add(a, product.variantId);
    expect(again.status).toBe(400);
    expect(again.body.code).toBe("INSUFFICIENT_STOCK");
    expect(again.body.available).toBe(1);
    expect(again.body.message).toMatch(/already have all 1/i);
    expect((await cartLine(a, product.variantId))!.quantity).toBe(1);
  });

  test("adding more than the stock in one go is refused", async () => {
    const { product, a } = await scene(1);
    const res = await add(a, product.variantId, 2);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Only 1 left.");
    expect(await cartLine(a, product.variantId)).toBeUndefined();
  });

  test("raising a line past the stock is refused; lowering always works", async () => {
    const { product, a } = await scene(3);
    ok(await add(a, product.variantId, 2), 201);
    const line = (await cartLine(a, product.variantId))!;
    const up = await api("PATCH", `/cart/${line.id}/quantity`, {
      token: a.token,
      body: { quantity: 4 },
    });
    expect(up.status).toBe(400);
    expect(up.body.available).toBe(3);
    ok(
      await api("PATCH", `/cart/${line.id}/adjust`, {
        token: a.token,
        body: { delta: -1 },
      }),
    );
    expect((await cartLine(a, product.variantId))!.quantity).toBe(1);
  });
});

describe("cart holds", () => {
  test("stock in one shopper's cart can't be added by another", async () => {
    const { product, a, b } = await scene(1);
    ok(await add(a, product.variantId), 201);

    const res = await add(b, product.variantId);
    expect(res.status).toBe(400);
    expect(res.body.available).toBe(0);
    expect(res.body.message).toMatch(/out of stock/i);
    // The catalogue shows it as out of stock too.
    expect(await available(product)).toBe(0);
  });

  test("the holder sees it as available to them", async () => {
    const { product, a } = await scene(2);
    ok(await add(a, product.variantId), 201);
    expect((await cartLine(a, product.variantId))!.availableQuantity).toBe(2);
    expect(await available(product)).toBe(1);
  });

  test("removing it from the cart releases the hold", async () => {
    const { product, a, b } = await scene(1);
    ok(await add(a, product.variantId), 201);
    const line = (await cartLine(a, product.variantId))!;
    ok(await api("DELETE", `/cart/${line.id}`, { token: a.token }));
    ok(await add(b, product.variantId), 201);
  });

  test("an abandoned cart's hold lapses", async () => {
    const { product, a, b } = await scene(1);
    ok(await add(a, product.variantId), 201);
    await expireCartHolds(a.id);
    ok(await add(b, product.variantId), 201);
  });

  test("two shoppers racing for the last unit: exactly one gets it", async () => {
    const { product, a, b } = await scene(1);
    const results = await Promise.all([
      add(a, product.variantId),
      add(b, product.variantId),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
  });
});

describe("checkout", () => {
  const checkout = async (user: TestUser) => {
    const address = await createAddress(user, m.zone.county);
    return api("POST", "/orders/me", {
      token: user.token,
      body: { deliveryAddressId: address.id },
    });
  };

  test("the holder can check out their held unit; then it's gone for everyone", async () => {
    const { product, a, b } = await scene(1);
    ok(await add(a, product.variantId), 201);
    ok(await checkout(a), 201);
    expect(await available(product)).toBe(0);
    expect((await add(b, product.variantId)).status).toBe(400);
  });

  test("checkout can't take stock another shopper now holds", async () => {
    const { product, a, b } = await scene(1);
    ok(await add(a, product.variantId), 201);
    // A wanders off; the hold lapses and B takes the unit.
    await expireCartHolds(a.id);
    ok(await add(b, product.variantId), 201);

    const res = await checkout(a);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INSUFFICIENT_STOCK");
    expect(res.body.variantId).toBe(product.variantId);
    // Nothing was taken from stock by the failed attempt.
    ok(await checkout(b), 201);
  });

  test("two checkouts racing for the last unit: exactly one succeeds", async () => {
    const { product, a, b } = await scene(1);
    ok(await add(a, product.variantId), 201);
    await expireCartHolds(a.id);
    ok(await add(b, product.variantId), 201);
    await expireCartHolds(b.id);

    const [ra, rb] = await Promise.all([checkout(a), checkout(b)]);
    expect([ra.status, rb.status].sort()).toEqual([201, 400]);
    const { variants } = ok<{
      variants: { id: string; stockQuantity: number }[];
    }>(
      await api("GET", `/products/me/${product.id}`, { token: m.seller.token }),
    );
    expect(
      variants.find((v) => v.id === product.variantId)!.stockQuantity,
    ).toBe(0);
  });
});
