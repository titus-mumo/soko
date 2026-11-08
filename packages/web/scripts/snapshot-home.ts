// Saves what the home page shows (categories, the newest 8 products and
// their photos) into the web app, so the page renders instantly from the
// site itself while the API is asleep or slow to wake.
//
//   bun run snapshot:home [api-url]     (defaults to NEXT_PUBLIC_API_URL)
//
// Point it at the production API and commit the result: public/home/* and
// src/data/home-snapshot.json. Re-run whenever the featured products change.
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const API = (
  process.argv[2] ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/+$/, "");
const ROOT = join(import.meta.dir, "..");
const IMAGE_DIR = join(ROOT, "public", "home");
const DATA_FILE = join(ROOT, "src", "data", "home-snapshot.json");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

async function get<T>(path: string): Promise<T> {
  // A sleeping Render instance can take a minute to wake.
  const res = await fetch(API + path, { signal: AbortSignal.timeout(90_000) });
  const body = (await res.json()) as { success: boolean; data: T };
  if (!res.ok || !body.success) throw new Error(`${path}: HTTP ${res.status}`);
  return body.data;
}

console.log(`Snapshotting the home page from ${API}`);
const [categories, products, zones] = await Promise.all([
  get<{ id: string; name: string; slug: string; icon?: string | null }[]>(
    "/categories",
  ),
  get<
    {
      id: string;
      name: string;
      slug: string;
      condition: string;
      price: string;
      compareAtPrice: string | null;
      image: string | null;
      hasOptions: boolean;
      soldOut: boolean;
    }[]
  >("/products?limit=8"),
  get<{ county: string }[]>("/delivery/zones"),
]);
if (products.length === 0)
  throw new Error("The API listed no products — keeping the old snapshot.");

// Start from an empty folder so photos of products that left the page go.
await mkdir(IMAGE_DIR, { recursive: true });
for (const f of await readdir(IMAGE_DIR)) await rm(join(IMAGE_DIR, f));

// Remote photo URL → its copy under /home.
const images: Record<string, string> = {};
for (const p of products) {
  if (!p.image || images[p.image]) continue;
  try {
    const res = await fetch(p.image, { signal: AbortSignal.timeout(30_000) });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !EXT[type]) throw new Error(`HTTP ${res.status} ${type}`);
    const file = `${p.slug}.${EXT[type]}`;
    await Bun.write(join(IMAGE_DIR, file), await res.arrayBuffer());
    images[p.image] = `/home/${file}`;
  } catch (err) {
    console.warn(`  skipped the photo for ${p.slug}: ${String(err)}`);
  }
}

const snapshot = {
  takenAt: new Date().toISOString(),
  counties: new Set(zones.map((z) => z.county.trim().toLowerCase())).size,
  categories: categories.map(({ id, name, slug, icon }) => ({
    id,
    name,
    slug,
    icon: icon ?? null,
  })),
  // No variantId: the variant ids may change, so "Add to cart" on these
  // cards opens the product page instead.
  products: products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    condition: p.condition,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    image: (p.image && images[p.image]) ?? null,
    variantId: null,
    hasOptions: p.hasOptions,
    soldOut: p.soldOut,
  })),
  images,
};
await mkdir(join(ROOT, "src", "data"), { recursive: true });
await Bun.write(DATA_FILE, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `Saved ${products.length} products, ${categories.length} categories and ${Object.keys(images).length} photos.`,
);
