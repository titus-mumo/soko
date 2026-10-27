// Product photos live in Supabase Storage (a public bucket), not on the API
// server's disk — Render's disk is wiped on every deploy. Talks to the
// Storage REST API directly; needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// (server-only: the service key can write anything).

const BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Image formats we accept, recognised by their first bytes, not the name. */
const FORMATS: {
  ext: string;
  type: string;
  matches: (b: Uint8Array) => boolean;
}[] = [
  {
    ext: "jpg",
    type: "image/jpeg",
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    type: "image/png",
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    ext: "webp",
    type: "image/webp",
    matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  },
  {
    ext: "avif",
    type: "image/avif",
    matches: (b) =>
      ascii(b, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(b, 8, 12)),
  },
];

const ascii = (b: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...b.subarray(from, to));

/** The real format of an image file, or null if it isn't one we accept. */
export function sniffImage(bytes: Uint8Array) {
  return FORMATS.find((f) => f.matches(bytes)) ?? null;
}

function config() {
  const url = Bun.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export const storageConfigured = () => config() !== null;

const headers = (key: string) => ({
  Authorization: `Bearer ${key}`,
  apikey: key,
});

let bucketReady = false;

/** Creates the public bucket the first time it's needed. */
async function ensureBucket(url: string, key: string) {
  if (bucketReady) return;
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers(key), "Content-Type": "application/json" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: MAX_IMAGE_BYTES,
      allowed_mime_types: FORMATS.map((f) => f.type),
    }),
  });
  // 409 / "already exists" is fine.
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    if (!/already exists|Duplicate/i.test(text))
      throw new Error(`Storage bucket setup failed: ${res.status} ${text}`);
  }
  bucketReady = true;
}

/** Stores an image and returns its public URL. */
export async function uploadProductImage(
  bytes: Uint8Array,
  format: { ext: string; type: string },
): Promise<string> {
  const cfg = config();
  if (!cfg) throw new Error("Storage isn't configured");
  await ensureBucket(cfg.url, cfg.key);
  const now = new Date();
  const path = `products/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${format.ext}`;
  const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      ...headers(cfg.key),
      "Content-Type": format.type,
      // Unique names, so cache forever.
      "cache-control": "31536000",
      "x-upsert": "false",
    },
    body: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: format.type }),
  });
  if (!res.ok)
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  return `${cfg.url}/storage/v1/object/public/${BUCKET}/${path}`;
}
