import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  api,
  createAdmin,
  createCategory,
  createProduct,
  createSeller,
  createUser,
  missingId,
  ok,
  RUN,
  Tracker,
  type TestProduct,
  type TestSeller,
  type TestUser,
} from "./helpers";

const t = new Tracker();
let admin: TestUser;
let seller: TestSeller;
let otherSeller: TestSeller;
let buyer: TestUser;
let category: { id: string };
let product: TestProduct;

beforeAll(async () => {
  admin = await createAdmin(t);
  seller = await createSeller(t);
  otherSeller = await createSeller(t);
  buyer = await createUser(t);
  category = await createCategory(t, admin);
  product = await createProduct(seller, category.id);
});
afterAll(() => t.cleanup());

describe("POST /products", () => {
  test("creates a draft with variants, images and tags", async () => {
    const slug = `create-${RUN}`;
    const created = ok(
      await api("POST", "/products", {
        token: seller.token,
        body: {
          name: "Created Product",
          slug,
          categoryId: category.id,
          condition: "used",
          variants: [
            { sku: `A-${slug}`, price: "500.00", stockQuantity: 3, size: "S" },
            { sku: `B-${slug}`, price: "650.00", stockQuantity: 1, size: "M" },
          ],
          images: [
            { url: "https://picsum.photos/1" },
            { url: "https://picsum.photos/2" },
          ],
          tags: ["alpha", "beta"],
        },
      }),
      201,
    );
    expect(created.product.status).toBe("draft");
    expect(created.variants).toHaveLength(2);
    expect(
      created.images.filter((i: { isPrimary: boolean }) => i.isPrimary),
    ).toHaveLength(1);
    expect(created.tags.map((x: { tag: string }) => x.tag).sort()).toEqual([
      "alpha",
      "beta",
    ]);
  });

  test("rejects a duplicate slug", async () => {
    const res = await api("POST", "/products", {
      token: seller.token,
      body: {
        name: "Dup",
        slug: product.slug,
        categoryId: category.id,
        condition: "new",
        variants: [{ sku: `DUP-${RUN}`, price: "1.00" }],
      },
    });
    expect(res.status).toBe(409);
  });

  test("rejects an unknown category", async () => {
    const res = await api("POST", "/products", {
      token: seller.token,
      body: {
        name: "Lost",
        slug: `lost-${RUN}`,
        categoryId: missingId(),
        condition: "new",
        variants: [{ sku: `LOST-${RUN}`, price: "1.00" }],
      },
    });
    expect(res.status).toBe(404);
  });

  test("requires at least one variant", async () => {
    const res = await api("POST", "/products", {
      token: seller.token,
      body: {
        name: "Empty",
        slug: `empty-${RUN}`,
        categoryId: category.id,
        condition: "new",
        variants: [],
      },
    });
    expect(res.status).toBe(400);
  });

  test("is seller-only", async () => {
    const res = await api("POST", "/products", {
      token: buyer.token,
      body: {
        name: "Nope",
        slug: `nope-${RUN}`,
        categoryId: category.id,
        condition: "new",
        variants: [{ sku: `NOPE-${RUN}`, price: "1.00" }],
      },
    });
    expect(res.status).toBe(403);
  });
});

describe("public product reads", () => {
  test("GET /products/by-slug/:slug", async () => {
    const p = ok(await api("GET", `/products/by-slug/${product.slug}`));
    expect(p.id).toBe(product.id);
    // The store is summarised, never identified; no internals.
    expect(p.seller).toHaveProperty("isVerified");
    for (const key of [
      "sellerId",
      "status",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ])
      expect(p).not.toHaveProperty(key);
  });

  test("GET /products/by-slug/:slug is 404 for unknown slugs", async () => {
    expect((await api("GET", `/products/by-slug/missing-${RUN}`)).status).toBe(
      404,
    );
  });

  test("GET /products/by-category/:id lists active products only", async () => {
    const draft = await createProduct(seller, category.id, { publish: false });
    const list = ok<{ id: string }[]>(
      await api("GET", `/products/by-category/${category.id}`),
    );
    expect(list.map((p) => p.id)).toContain(product.id);
    expect(list.map((p) => p.id)).not.toContain(draft.id);
  });

  test("GET /products/by-seller/:sellerId lists the store's active products", async () => {
    const list = ok<{ id: string }[]>(
      await api("GET", `/products/by-seller/${seller.sellerId}`),
    );
    expect(list.map((p) => p.id)).toContain(product.id);
  });

  test("GET /products/:id/variants, images and tags", async () => {
    const variants = ok<{ id: string }[]>(
      await api("GET", `/products/${product.id}/variants`),
    );
    expect(variants.map((v) => v.id)).toContain(product.variantId);
    const images = ok<{ id: string }[]>(
      await api("GET", `/products/${product.id}/images`),
    );
    expect(images.map((i) => i.id)).toContain(product.imageId);
    const tags = ok<{ tag: string }[]>(
      await api("GET", `/products/${product.id}/tags`),
    );
    expect(tags.map((x) => x.tag).sort()).toEqual(["suite", "test"]);
  });

  test("GET /products/variants/:id resolves a variant to its product", async () => {
    const d = ok(await api("GET", `/products/variants/${product.variantId}`));
    expect(d.variant.id).toBe(product.variantId);
    expect(d.product.id).toBe(product.id);
    expect(d.primaryImage?.url).toBeTruthy();
    expect(d.product).not.toHaveProperty("sellerId");
    expect(d.variant).not.toHaveProperty("sku");
    expect(d.variant).not.toHaveProperty("stockQuantity");
  });

  test("GET /products/variants/:id is 404 for unknown variants", async () => {
    expect((await api("GET", `/products/variants/${missingId()}`)).status).toBe(
      404,
    );
  });
});

describe("GET /products/me", () => {
  test("lists the seller's products including drafts", async () => {
    const draft = await createProduct(seller, category.id, { publish: false });
    const mine = ok<{ id: string }[]>(
      await api("GET", "/products/me", { token: seller.token }),
    );
    expect(mine.map((p) => p.id)).toEqual(
      expect.arrayContaining([product.id, draft.id]),
    );
  });

  test("doesn't include other sellers' products", async () => {
    const theirs = ok<{ id: string }[]>(
      await api("GET", "/products/me", { token: otherSeller.token }),
    );
    expect(theirs.map((p) => p.id)).not.toContain(product.id);
  });

  test("is seller-only", async () => {
    expect(
      (await api("GET", "/products/me", { token: buyer.token })).status,
    ).toBe(403);
  });
});

describe("product management", () => {
  test("PATCH /products/:id updates details", async () => {
    const p = ok(
      await api("PATCH", `/products/${product.id}`, {
        token: seller.token,
        body: { description: "Updated description", condition: "refurbished" },
      }),
    );
    expect(p.description).toBe("Updated description");
    expect(p.condition).toBe("refurbished");
  });

  test("PATCH /products/:id by another seller is rejected", async () => {
    const res = await api("PATCH", `/products/${product.id}`, {
      token: otherSeller.token,
      body: { name: "Hijacked" },
    });
    expect([403, 404]).toContain(res.status);
  });

  test("unpublish → draft, publish → active", async () => {
    ok(
      await api("PATCH", `/products/${product.id}/unpublish`, {
        token: seller.token,
      }),
    );
    // Drafts aren't public; the owner still sees it.
    expect((await api("GET", `/products/by-slug/${product.slug}`)).status).toBe(
      404,
    );
    expect(
      ok(
        await api("GET", `/products/me/${product.id}`, { token: seller.token }),
      ).status,
    ).toBe("draft");
    ok(
      await api("PATCH", `/products/${product.id}/publish`, {
        token: seller.token,
      }),
    );
    expect(
      ok(
        await api("GET", `/products/me/${product.id}`, { token: seller.token }),
      ).status,
    ).toBe("active");
    expect((await api("GET", `/products/by-slug/${product.slug}`)).status).toBe(
      200,
    );
  });

  test("publish of an unknown product is 404", async () => {
    const res = await api("PATCH", `/products/${missingId()}/publish`, {
      token: seller.token,
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /products/:id removes it", async () => {
    const p = await createProduct(seller, category.id);
    ok(await api("DELETE", `/products/${p.id}`, { token: seller.token }));
    expect((await api("GET", `/products/by-slug/${p.slug}`)).status).toBe(404);
  });

  test("DELETE by another seller is rejected", async () => {
    const res = await api("DELETE", `/products/${product.id}`, {
      token: otherSeller.token,
    });
    expect([403, 404]).toContain(res.status);
    expect((await api("GET", `/products/by-slug/${product.slug}`)).status).toBe(
      200,
    );
  });
});

describe("variants", () => {
  let variantId: string;

  test("POST /products/:id/variants adds one", async () => {
    const v = ok(
      await api("POST", `/products/${product.id}/variants`, {
        token: seller.token,
        body: {
          sku: `EXTRA-${RUN}`,
          price: "1200.00",
          stockQuantity: 4,
          color: "Red",
        },
      }),
      201,
    );
    variantId = v.id;
    expect(v.color).toBe("Red");
  });

  test("PATCH /products/:id/variants/:vid updates it", async () => {
    const v = ok(
      await api("PATCH", `/products/${product.id}/variants/${variantId}`, {
        token: seller.token,
        body: { price: "1100.00" },
      }),
    );
    expect(v.price).toBe("1100.00");
  });

  test("PATCH …/stock adjusts stock by a delta", async () => {
    const v = ok(
      await api(
        "PATCH",
        `/products/${product.id}/variants/${variantId}/stock`,
        {
          token: seller.token,
          body: { delta: -3 },
        },
      ),
    );
    expect(v.stockQuantity).toBe(1);
  });

  test("PATCH of an unknown variant is 404", async () => {
    const res = await api(
      "PATCH",
      `/products/${product.id}/variants/${missingId()}`,
      {
        token: seller.token,
        body: { price: "1.00" },
      },
    );
    expect(res.status).toBe(404);
  });

  test("DELETE /products/:id/variants/:vid removes it", async () => {
    ok(
      await api("DELETE", `/products/${product.id}/variants/${variantId}`, {
        token: seller.token,
      }),
    );
    const variants = ok<{ id: string }[]>(
      await api("GET", `/products/${product.id}/variants`),
    );
    expect(variants.map((v) => v.id)).not.toContain(variantId);
  });
});

describe("images and tags", () => {
  let imageId: string;

  test("POST /products/:id/images adds an image", async () => {
    const img = ok(
      await api("POST", `/products/${product.id}/images`, {
        token: seller.token,
        body: { url: "https://picsum.photos/3", sortOrder: 1 },
      }),
      201,
    );
    imageId = img.id;
    expect(img.isPrimary).toBe(false);
  });

  test("PATCH …/images/:iid/primary makes it the only primary", async () => {
    ok(
      await api("PATCH", `/products/${product.id}/images/${imageId}/primary`, {
        token: seller.token,
      }),
    );
    const images = ok<{ id: string; isPrimary: boolean }[]>(
      await api("GET", `/products/${product.id}/images`),
    );
    expect(images.filter((i) => i.isPrimary).map((i) => i.id)).toEqual([
      imageId,
    ]);
  });

  test("PATCH primary of an unknown image is 404", async () => {
    const res = await api(
      "PATCH",
      `/products/${product.id}/images/${missingId()}/primary`,
      {
        token: seller.token,
      },
    );
    expect(res.status).toBe(404);
  });

  test("DELETE /products/:id/images/:iid removes it", async () => {
    ok(
      await api("DELETE", `/products/${product.id}/images/${imageId}`, {
        token: seller.token,
      }),
    );
    const images = ok<{ id: string }[]>(
      await api("GET", `/products/${product.id}/images`),
    );
    expect(images.map((i) => i.id)).not.toContain(imageId);
  });

  test("PUT /products/:id/tags replaces all tags", async () => {
    ok(
      await api("PUT", `/products/${product.id}/tags`, {
        token: seller.token,
        body: { tags: ["fresh", "new"] },
      }),
    );
    const tags = ok<{ tag: string }[]>(
      await api("GET", `/products/${product.id}/tags`),
    );
    expect(tags.map((x) => x.tag).sort()).toEqual(["fresh", "new"]);
  });

  test("image and tag writes are seller-only", async () => {
    expect(
      (
        await api("POST", `/products/${product.id}/images`, {
          token: buyer.token,
          body: { url: "https://picsum.photos/4" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await api("PUT", `/products/${product.id}/tags`, {
          token: buyer.token,
          body: { tags: ["x"] },
        })
      ).status,
    ).toBe(403);
  });
});

describe("keeping deals on Soko", () => {
  const listing = (over: Record<string, unknown>) => ({
    name: "Clean Listing",
    slug: `clean-${crypto.randomUUID().slice(0, 8)}`,
    categoryId: category.id,
    condition: "new",
    variants: [
      { sku: `SKU-${crypto.randomUUID().slice(0, 8)}`, price: "100.00" },
    ],
    ...over,
  });

  for (const [what, field] of [
    ["a phone number", { description: "Call 0712 345 678 for deals" }],
    ["a +254 number", { description: "Reach us on +254-712-345-678" }],
    ["an email", { description: "Email me at shop@example.com" }],
    ["a WhatsApp handle", { description: "Order on WhatsApp instead" }],
    ["a link", { name: "Visit www.myshop.co.ke" }],
    ["a phone in a tag", { tags: ["0712345678"] }],
  ] as const) {
    test(`POST /products rejects ${what}`, async () => {
      const res = await api("POST", "/products", {
        token: seller.token,
        body: listing(field),
      });
      expect(res.status).toBe(400);
    });
  }

  test("ordinary listings still go through", async () => {
    const res = await api("POST", "/products", {
      token: seller.token,
      body: listing({ description: "55 inch 4K TV, 2 year warranty, 120Hz" }),
    });
    expect(res.status).toBe(201);
  });

  test("PATCH /products/:id rejects contact details", async () => {
    const res = await api("PATCH", `/products/${product.id}`, {
      token: seller.token,
      body: { description: "DM me on instagram" },
    });
    expect(res.status).toBe(400);
  });

  test("PUT /products/:id/tags is owner-only and filtered", async () => {
    const theirs = await api("PUT", `/products/${product.id}/tags`, {
      token: otherSeller.token,
      body: { tags: ["hijacked"] },
    });
    expect(theirs.status).toBe(404);
    const contact = await api("PUT", `/products/${product.id}/tags`, {
      token: seller.token,
      body: { tags: ["call 0712345678"] },
    });
    expect(contact.status).toBe(400);
    ok(
      await api("PUT", `/products/${product.id}/tags`, {
        token: seller.token,
        body: { tags: ["phones", "audio"] },
      }),
    );
  });
});
