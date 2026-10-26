// Seeds a demo seller with a store, categories, published products and
// delivery zones. Safe to re-run: anything that already exists (matched by
// email / slug / county) is reused, not duplicated.
//
//   bun run seed:seller

import {
  UserRepository,
  SellerProfileRepository,
  CategoryRepository,
  ProductRepository,
  ProductVariantRepository,
  ProductImageRepository,
  ProductTagRepository,
  DeliveryZoneRepository,
} from "../index";

const users = new UserRepository();
const sellers = new SellerProfileRepository();
const categories = new CategoryRepository();
const products = new ProductRepository();
const variants = new ProductVariantRepository();
const images = new ProductImageRepository();
const tags = new ProductTagRepository();
const zones = new DeliveryZoneRepository();

const SELLER = {
  name: "Amina Wanjiru",
  email: "seller@soko.test",
  phone: "+254700000101",
  password: "Seller123",
};

const STORE = {
  storeName: "Amina's Duka",
  storeSlug: "aminas-duka",
  storeDescription:
    "Electronics, fashion and home goods, delivered across Kenya. Genuine products, fair prices.",
  storeLogo: "https://picsum.photos/seed/aminas-duka/200/200",
};

// parent slug → children
const CATEGORIES: {
  name: string;
  slug: string;
  children: { name: string; slug: string }[];
}[] = [
  {
    name: "Electronics",
    slug: "electronics",
    children: [
      { name: "Phones", slug: "phones" },
      { name: "Audio", slug: "audio" },
    ],
  },
  {
    name: "Fashion",
    slug: "fashion",
    children: [
      { name: "Women", slug: "women" },
      { name: "Men", slug: "men" },
    ],
  },
  {
    name: "Home & Kitchen",
    slug: "home-kitchen",
    children: [],
  },
];

type SeedVariant = {
  sku: string;
  price: string;
  compareAtPrice?: string;
  stockQuantity: number;
  size?: string;
  color?: string;
  material?: string;
};

const PRODUCTS: {
  name: string;
  slug: string;
  category: string;
  condition: "new" | "used" | "refurbished";
  description: string;
  tags: string[];
  variants: SeedVariant[];
}[] = [
  {
    name: "Tecno Spark 20 Pro",
    slug: "tecno-spark-20-pro",
    category: "phones",
    condition: "new",
    description:
      '6.78" FHD+ display, 108MP camera, 5000mAh battery with 33W fast charging. Dual SIM, 1-year warranty.',
    tags: ["phone", "tecno", "android", "smartphone"],
    variants: [
      {
        sku: "AD-TSP20-128-BLK",
        price: "21999.00",
        compareAtPrice: "24500.00",
        stockQuantity: 14,
        size: "128GB",
        color: "Black",
      },
      {
        sku: "AD-TSP20-256-BLK",
        price: "25999.00",
        stockQuantity: 8,
        size: "256GB",
        color: "Black",
      },
      {
        sku: "AD-TSP20-256-GLD",
        price: "25999.00",
        stockQuantity: 3,
        size: "256GB",
        color: "Gold",
      },
    ],
  },
  {
    name: "Samsung Galaxy A15 (Refurbished)",
    slug: "samsung-galaxy-a15-refurb",
    category: "phones",
    condition: "refurbished",
    description:
      'Grade A refurbished, fully tested. 6.5" Super AMOLED, 50MP triple camera, 128GB storage. 6-month warranty.',
    tags: ["phone", "samsung", "refurbished"],
    variants: [
      {
        sku: "AD-SGA15-R-BLU",
        price: "14500.00",
        compareAtPrice: "19999.00",
        stockQuantity: 5,
        size: "128GB",
        color: "Blue",
      },
    ],
  },
  {
    name: "Oraimo FreePods 4 Earbuds",
    slug: "oraimo-freepods-4",
    category: "audio",
    condition: "new",
    description:
      "Active noise cancellation, 35.5-hour total playtime, IPX5 water resistance. Fast-pair with Android.",
    tags: ["earbuds", "oraimo", "bluetooth", "audio"],
    variants: [
      {
        sku: "AD-OFP4-BLK",
        price: "3999.00",
        compareAtPrice: "4599.00",
        stockQuantity: 40,
        color: "Black",
      },
      {
        sku: "AD-OFP4-WHT",
        price: "3999.00",
        stockQuantity: 22,
        color: "White",
      },
    ],
  },
  {
    name: "Kitenge Wrap Dress",
    slug: "kitenge-wrap-dress",
    category: "women",
    condition: "new",
    description:
      "Hand-tailored in Nairobi from 100% cotton Ankara print. Adjustable wrap waist, midi length.",
    tags: ["dress", "kitenge", "ankara", "handmade"],
    variants: [
      {
        sku: "AD-KWD-S",
        price: "3500.00",
        stockQuantity: 6,
        size: "S",
        material: "Cotton",
      },
      {
        sku: "AD-KWD-M",
        price: "3500.00",
        stockQuantity: 9,
        size: "M",
        material: "Cotton",
      },
      {
        sku: "AD-KWD-L",
        price: "3800.00",
        stockQuantity: 4,
        size: "L",
        material: "Cotton",
      },
    ],
  },
  {
    name: "Maasai Shuka Blanket",
    slug: "maasai-shuka-blanket",
    category: "women",
    condition: "new",
    description:
      "Traditional red check shuka, 150 × 200cm. Warm acrylic weave — throw, picnic blanket or wrap.",
    tags: ["shuka", "maasai", "blanket", "traditional"],
    variants: [
      {
        sku: "AD-SHUKA-RED",
        price: "1200.00",
        stockQuantity: 30,
        color: "Red",
      },
      {
        sku: "AD-SHUKA-BLU",
        price: "1200.00",
        stockQuantity: 18,
        color: "Blue",
      },
    ],
  },
  {
    name: "Men's Leather Sandals",
    slug: "mens-leather-sandals",
    category: "men",
    condition: "new",
    description:
      "Handmade genuine leather sandals with tyre-rubber soles. Built to last.",
    tags: ["sandals", "leather", "footwear", "handmade"],
    variants: [
      {
        sku: "AD-MLS-41",
        price: "2200.00",
        stockQuantity: 7,
        size: "41",
        material: "Leather",
      },
      {
        sku: "AD-MLS-42",
        price: "2200.00",
        stockQuantity: 10,
        size: "42",
        material: "Leather",
      },
      {
        sku: "AD-MLS-43",
        price: "2200.00",
        stockQuantity: 0,
        size: "43",
        material: "Leather",
      },
    ],
  },
  {
    name: "Jiko Koa Charcoal Stove",
    slug: "jiko-koa-charcoal-stove",
    category: "home-kitchen",
    condition: "new",
    description:
      "Energy-efficient ceramic-lined jiko. Uses up to 50% less charcoal than a standard stove.",
    tags: ["jiko", "stove", "kitchen", "energy-saving"],
    variants: [
      {
        sku: "AD-JIKO-STD",
        price: "2800.00",
        compareAtPrice: "3200.00",
        stockQuantity: 12,
      },
    ],
  },
  {
    name: "Kenyan AA Coffee Beans 500g",
    slug: "kenyan-aa-coffee-500g",
    category: "home-kitchen",
    condition: "new",
    description:
      "Single-origin AA beans from Nyeri. Medium roast with blackcurrant and citrus notes.",
    tags: ["coffee", "nyeri", "beans"],
    variants: [
      {
        sku: "AD-COF-500-WB",
        price: "1450.00",
        stockQuantity: 25,
        size: "Whole bean",
      },
      {
        sku: "AD-COF-500-GR",
        price: "1450.00",
        stockQuantity: 20,
        size: "Ground",
      },
    ],
  },
  {
    // Left as a draft so the seller listings page has something to publish.
    name: "Used HP EliteBook 840 G5",
    slug: "used-hp-elitebook-840-g5",
    category: "electronics",
    condition: "used",
    description:
      'Core i5 8th gen, 8GB RAM, 256GB SSD, 14" FHD. Light wear on the lid, battery holds ~4 hours.',
    tags: ["laptop", "hp", "used"],
    variants: [{ sku: "AD-HP840G5-U", price: "32000.00", stockQuantity: 2 }],
  },
];

const DRAFT_SLUGS = new Set(["used-hp-elitebook-840-g5"]);

const ZONES = [
  {
    name: "Nairobi CBD & Environs",
    county: "Nairobi",
    estimatedDays: 1,
    baseFee: "200.00",
  },
  { name: "Kiambu", county: "Kiambu", estimatedDays: 2, baseFee: "300.00" },
  { name: "Mombasa", county: "Mombasa", estimatedDays: 3, baseFee: "450.00" },
  { name: "Kisumu", county: "Kisumu", estimatedDays: 3, baseFee: "450.00" },
  { name: "Nakuru", county: "Nakuru", estimatedDays: 2, baseFee: "350.00" },
];

const log = (msg: string) => console.info(`  ${msg}`);

async function seedSeller() {
  let user = await users.findUserByEmail(SELLER.email);
  if (typeof user === "string") {
    const created = await users.insertUser({
      name: SELLER.name,
      email: SELLER.email,
      phone: SELLER.phone,
      passwordHash: SELLER.password, // hashed by the repository
      role: "seller",
      isVerified: true,
    });
    if (!created) throw new Error("Failed to create seller user");
    user = created;
    log(`created user ${SELLER.email}`);
  } else {
    if (user.role !== "seller") await users.updateUserRole(user.id, "seller");
    log(`reusing user ${SELLER.email}`);
  }

  let profile = await sellers.findSellerProfileByUserId(user.id);
  if (typeof profile === "string") {
    const created = await sellers.insertSellerProfile({
      userId: user.id,
      ...STORE,
      isVerified: true,
      totalSales: 37,
      rating: "4.60",
    });
    if (!created) throw new Error("Failed to create seller profile");
    profile = created;
    log(`created store "${STORE.storeName}"`);
  } else {
    log(`reusing store "${profile.storeName}"`);
  }

  return profile;
}

async function seedCategories() {
  const bySlug: Record<string, string> = {};

  const ensure = async (name: string, slug: string, parentId?: string) => {
    const existing = await categories.findCategoryBySlug(slug);
    if (typeof existing !== "string") return existing.id;
    const created = await categories.insertCategory({ name, slug, parentId });
    if (!created) throw new Error(`Failed to create category ${slug}`);
    log(`created category ${slug}`);
    return created.id;
  };

  for (const root of CATEGORIES) {
    bySlug[root.slug] = await ensure(root.name, root.slug);
    for (const child of root.children) {
      bySlug[child.slug] = await ensure(
        child.name,
        child.slug,
        bySlug[root.slug],
      );
    }
  }
  return bySlug;
}

async function seedProducts(
  sellerId: string,
  categoryIds: Record<string, string>,
) {
  let created = 0;
  for (const p of PRODUCTS) {
    const existing = await products.findProductBySlug(p.slug);
    if (typeof existing !== "string") continue;

    const product = await products.insertProduct({
      sellerId,
      categoryId: categoryIds[p.category],
      name: p.name,
      slug: p.slug,
      description: p.description,
      condition: p.condition,
      status: DRAFT_SLUGS.has(p.slug) ? "draft" : "active",
    });
    if (!product) throw new Error(`Failed to create product ${p.slug}`);

    await variants.insertVariants(
      p.variants.map((v) => ({ productId: product.id, ...v })),
    );
    await images.insertImages(
      [1, 2, 3].map((n) => ({
        productId: product.id,
        url: `https://picsum.photos/seed/${p.slug}-${n}/800/800`,
        isPrimary: n === 1,
        sortOrder: n - 1,
      })),
    );
    await tags.insertTags(
      p.tags.map((tag) => ({ productId: product.id, tag })),
    );
    created++;
  }
  log(
    `created ${created} product(s), ${PRODUCTS.length - created} already existed`,
  );
}

async function seedZones() {
  let created = 0;
  for (const z of ZONES) {
    const existing = await zones.findZonesByCounty(z.county);
    if (existing.length > 0) continue;
    await zones.insertDeliveryZone(z);
    created++;
  }
  log(`created ${created} delivery zone(s)`);
}

async function main() {
  console.info("Seeding demo seller…");
  const profile = await seedSeller();
  const categoryIds = await seedCategories();
  await seedProducts(profile.id, categoryIds);
  await seedZones();
  console.info(
    `\nDone. Sign in as ${SELLER.email} / ${SELLER.password}  (store: /${STORE.storeSlug})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
