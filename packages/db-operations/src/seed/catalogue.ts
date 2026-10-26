// Seeds ~100 published products with real product photos, spread across a
// few demo stores and categories — enough to exercise paging, search and
// sorting. Product data and images come from the public DummyJSON catalogue
// (https://dummyjson.com/docs/products); prices are converted to KES.
// Safe to re-run: products (by slug), stores (by email) and categories (by
// slug) that already exist are reused, not duplicated.
//
//   bun run seed:catalogue            # 100 products
//   bun run seed:catalogue -- 150     # or another count (max ~180)

import {
  UserRepository,
  SellerProfileRepository,
  CategoryRepository,
  ProductRepository,
  ProductVariantRepository,
  ProductImageRepository,
  ProductTagRepository,
} from "../index";

const users = new UserRepository();
const sellers = new SellerProfileRepository();
const categories = new CategoryRepository();
const products = new ProductRepository();
const variants = new ProductVariantRepository();
const images = new ProductImageRepository();
const tags = new ProductTagRepository();

const COUNT = Number(process.argv[2]) || 100;
const SOURCE = "https://dummyjson.com/products?limit=0";
const USD_TO_KES = 130;

const STORES = [
  {
    user: {
      name: "Brian Otieno",
      email: "store1@soko.test",
      phone: "+254700000102",
    },
    storeName: "Lakeside Electronics",
    storeSlug: "lakeside-electronics",
    storeDescription: "Phones, laptops and accessories.",
  },
  {
    user: {
      name: "Grace Muthoni",
      email: "store2@soko.test",
      phone: "+254700000103",
    },
    storeName: "Mtindo Fashion House",
    storeSlug: "mtindo-fashion-house",
    storeDescription: "Clothing, shoes, watches and beauty.",
  },
  {
    user: {
      name: "Hassan Ali",
      email: "store3@soko.test",
      phone: "+254700000104",
    },
    storeName: "Pwani Home & Living",
    storeSlug: "pwani-home-living",
    storeDescription: "Furniture, kitchen, groceries and sports gear.",
  },
];
const STORE_PASSWORD = "Seller123";

// Our category tree. `parent` must appear earlier in the list.
const CATEGORIES: { name: string; slug: string; parent?: string }[] = [
  { name: "Electronics", slug: "electronics" },
  { name: "Phones", slug: "phones", parent: "electronics" },
  { name: "Laptops", slug: "laptops", parent: "electronics" },
  { name: "Tablets", slug: "tablets", parent: "electronics" },
  {
    name: "Phone Accessories",
    slug: "phone-accessories",
    parent: "electronics",
  },
  { name: "Fashion", slug: "fashion" },
  { name: "Women", slug: "women", parent: "fashion" },
  { name: "Men", slug: "men", parent: "fashion" },
  { name: "Watches & Eyewear", slug: "watches-eyewear", parent: "fashion" },
  { name: "Home & Kitchen", slug: "home-kitchen" },
  { name: "Furniture", slug: "furniture", parent: "home-kitchen" },
  { name: "Kitchen", slug: "kitchen", parent: "home-kitchen" },
  { name: "Home Decor", slug: "home-decor", parent: "home-kitchen" },
  { name: "Beauty", slug: "beauty" },
  { name: "Groceries", slug: "groceries" },
  { name: "Sports & Outdoors", slug: "sports-outdoors" },
];

// DummyJSON category → our category slug and store (index into STORES).
// Vehicles and motorcycles are left out.
const MAP: Record<
  string,
  { category: string; store: number; sizes?: string[] }
> = {
  smartphones: { category: "phones", store: 0 },
  laptops: { category: "laptops", store: 0 },
  tablets: { category: "tablets", store: 0 },
  "mobile-accessories": { category: "phone-accessories", store: 0 },
  "mens-shirts": { category: "men", store: 1, sizes: ["S", "M", "L", "XL"] },
  "mens-shoes": { category: "men", store: 1, sizes: ["41", "42", "43", "44"] },
  tops: { category: "women", store: 1, sizes: ["S", "M", "L"] },
  "womens-dresses": { category: "women", store: 1, sizes: ["S", "M", "L"] },
  "womens-shoes": {
    category: "women",
    store: 1,
    sizes: ["37", "38", "39", "40"],
  },
  "womens-bags": { category: "women", store: 1 },
  "womens-jewellery": { category: "women", store: 1 },
  "mens-watches": { category: "watches-eyewear", store: 1 },
  "womens-watches": { category: "watches-eyewear", store: 1 },
  sunglasses: { category: "watches-eyewear", store: 1 },
  beauty: { category: "beauty", store: 1 },
  fragrances: { category: "beauty", store: 1 },
  "skin-care": { category: "beauty", store: 1 },
  furniture: { category: "furniture", store: 2 },
  "kitchen-accessories": { category: "kitchen", store: 2 },
  "home-decoration": { category: "home-decor", store: 2 },
  groceries: { category: "groceries", store: 2 },
  "sports-accessories": { category: "sports-outdoors", store: 2 },
};

type SourceProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  stock: number;
  tags?: string[];
  brand?: string;
  images: string[];
  thumbnail: string;
};

const log = (msg: string) => console.info(`  ${msg}`);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** USD → KES, rounded to a shelf-friendly price (…49 / …99). */
function toKES(usd: number): number {
  const kes = usd * USD_TO_KES;
  const step = kes < 1000 ? 50 : kes < 20000 ? 100 : 500;
  return Math.max(49, Math.ceil(kes / step) * step - 1);
}

/** Takes `count` products round-robin across categories, so every shelf has some. */
function pickSpread(list: SourceProduct[], count: number): SourceProduct[] {
  const byCategory = new Map<string, SourceProduct[]>();
  for (const p of list) {
    if (!MAP[p.category]) continue;
    byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);
  }
  const queues = [...byCategory.values()];
  const picked: SourceProduct[] = [];
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && picked.length < count) picked.push(next);
    }
  }
  return picked;
}

async function seedStores(): Promise<string[]> {
  const ids: string[] = [];
  for (const s of STORES) {
    let user = await users.findUserByEmail(s.user.email);
    if (typeof user === "string") {
      const created = await users.insertUser({
        ...s.user,
        passwordHash: STORE_PASSWORD, // hashed by the repository
        role: "seller",
        isVerified: true,
      });
      if (!created) throw new Error(`Failed to create ${s.user.email}`);
      user = created;
    }
    let profile = await sellers.findSellerProfileByUserId(user.id);
    if (typeof profile === "string") {
      const created = await sellers.insertSellerProfile({
        userId: user.id,
        storeName: s.storeName,
        storeSlug: s.storeSlug,
        storeDescription: s.storeDescription,
        isVerified: true,
      });
      if (!created) throw new Error(`Failed to create store ${s.storeSlug}`);
      profile = created;
      log(`created store "${s.storeName}" (${s.user.email})`);
    }
    ids.push(profile.id);
  }
  return ids;
}

async function seedCategories(): Promise<Record<string, string>> {
  const bySlug: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const existing = await categories.findCategoryBySlug(c.slug);
    if (typeof existing !== "string") {
      bySlug[c.slug] = existing.id;
      continue;
    }
    const created = await categories.insertCategory({
      name: c.name,
      slug: c.slug,
      parentId: c.parent ? bySlug[c.parent] : undefined,
    });
    if (!created) throw new Error(`Failed to create category ${c.slug}`);
    bySlug[c.slug] = created.id;
    log(`created category ${c.slug}`);
  }
  return bySlug;
}

async function main() {
  console.info(`Seeding ${COUNT} catalogue products…`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Couldn't fetch ${SOURCE}: HTTP ${res.status}`);
  const { products: source } = (await res.json()) as {
    products: SourceProduct[];
  };

  const storeIds = await seedStores();
  const categoryIds = await seedCategories();
  const picked = pickSpread(source, COUNT);

  let created = 0;
  // Spread "listed" dates over the last 60 days (newest first in the list
  // above), so newest-first sorting has something to show.
  const now = Date.now();
  for (const [i, p] of picked.entries()) {
    const map = MAP[p.category];
    const slug = slugify(p.title);
    if (typeof (await products.findProductBySlug(slug)) !== "string") continue;

    const listedAt = new Date(
      now - ((i * 60) / picked.length) * 86_400_000 - i * 60_000,
    );
    const product = await products.insertProduct({
      sellerId: storeIds[map.store],
      categoryId: categoryIds[map.category],
      name: p.title,
      slug,
      description: p.description,
      condition: "new",
      status: "active",
      createdAt: listedAt,
      updatedAt: listedAt,
    });
    if (!product) throw new Error(`Failed to create product ${slug}`);

    const price = toKES(p.price);
    // A real discount when the source has a meaningful one.
    const compareAtPrice =
      p.discountPercentage >= 10
        ? String(toKES(p.price / (1 - p.discountPercentage / 100)))
        : undefined;
    const sizes = map.sizes ?? [null];
    // Split the stock across sizes; a few items are deliberately sold out.
    const perSize =
      p.stock < 5 ? 0 : Math.max(1, Math.floor(p.stock / sizes.length));
    await variants.insertVariants(
      sizes.map((size) => ({
        productId: product.id,
        sku: `DJ-${p.id}${size ? `-${size}` : ""}`,
        size: size ?? undefined,
        price: String(price),
        compareAtPrice,
        stockQuantity: perSize,
      })),
    );

    const photos = (p.images.length > 0 ? p.images : [p.thumbnail]).slice(0, 4);
    await images.insertImages(
      photos.map((url, n) => ({
        productId: product.id,
        url,
        isPrimary: n === 0,
        sortOrder: n,
      })),
    );

    const productTags = [
      ...new Set(
        [...(p.tags ?? []), ...(p.brand ? [p.brand] : [])].map((t) =>
          t.toLowerCase(),
        ),
      ),
    ].slice(0, 6);
    if (productTags.length > 0)
      await tags.insertTags(
        productTags.map((tag) => ({ productId: product.id, tag })),
      );
    created++;
  }

  log(
    `created ${created} product(s), ${picked.length - created} already existed`,
  );
  console.info(
    `\nDone. Store logins: ${STORES.map((s) => s.user.email).join(", ")} / ${STORE_PASSWORD}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
