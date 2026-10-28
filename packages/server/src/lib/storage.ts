// Product photos and profile pictures live in Supabase Storage (public
// buckets), not on the API server's disk — Render's disk is wiped on every deploy. Talks to the
// Storage REST API directly; needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// (server-only: the service key can write anything).

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Where each kind of image goes, and how big it may be. */
const BUCKETS = {
  products: { id: "product-images", maxBytes: MAX_IMAGE_BYTES },
  avatars: { id: "avatars", maxBytes: MAX_AVATAR_BYTES },
} as const;
type BucketName = keyof typeof BUCKETS;

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
  const key = Bun.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  // Only the project's origin matters: tolerate a pasted API path such as
  // "https://<ref>.supabase.co/rest/v1/" or a trailing slash.
  let url: string | undefined;
  try {
    url = Bun.env.SUPABASE_URL
      ? new URL(Bun.env.SUPABASE_URL.trim()).origin
      : undefined;
  } catch {
    url = undefined;
  }
  return url && key ? { url, key } : null;
}

export const storageConfigured = () => config() !== null;

/** A storage failure with a reason fit to show an admin. */
export class StorageError extends Error {}

/** Turns a Storage API error response into a short, actionable reason. */
async function storageError(
  what: string,
  res: Response,
): Promise<StorageError> {
  const text = (await res.text()).slice(0, 300);
  console.error(`Storage ${what} failed: ${res.status} ${text}`);
  const hint =
    res.status === 401 ||
    res.status === 403 ||
    /jws|jwt|signature|unauthori[sz]ed|row-level security/i.test(text)
      ? "Storage rejected the server's key — check SUPABASE_SERVICE_ROLE_KEY is the service_role / secret key (not anon/publishable) for the project in SUPABASE_URL."
      : res.status === 404
        ? "Storage wasn't found at SUPABASE_URL — it should be the project's https://<ref>.supabase.co address, not the database URL."
        : res.status === 413
          ? "Storage refused the file size."
          : `Storage ${what} failed (${res.status}): ${text}`;
  return new StorageError(hint);
}

/**
 * Auth headers for the Storage API. Legacy service_role keys are JWTs and go
 * in both headers. Newer secret keys (sb_secret_…) aren't JWTs: they must be
 * sent only as `apikey` — as a Bearer token they're rejected.
 */
const headers = (key: string): Record<string, string> =>
  key.startsWith("eyJ")
    ? { Authorization: `Bearer ${key}`, apikey: key }
    : { apikey: key };

const readyBuckets = new Set<string>();

/** Creates a public bucket the first time it's needed. */
async function ensureBucket(url: string, key: string, name: BucketName) {
  const bucket = BUCKETS[name];
  if (readyBuckets.has(bucket.id)) return;
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers(key), "Content-Type": "application/json" },
    body: JSON.stringify({
      id: bucket.id,
      name: bucket.id,
      public: true,
      file_size_limit: bucket.maxBytes,
      allowed_mime_types: FORMATS.map((f) => f.type),
    }),
  });
  // 409 / "already exists" is fine.
  if (!res.ok && res.status !== 409) {
    const text = await res.text();
    if (!/already exists|Duplicate/i.test(text))
      throw await storageError(
        "bucket setup",
        new Response(text, { status: res.status }),
      );
  }
  readyBuckets.add(bucket.id);
}

/** Stores an image under `folder` in a bucket; returns its public URL. */
async function uploadImage(
  name: BucketName,
  folder: string,
  bytes: Uint8Array,
  format: { ext: string; type: string },
): Promise<string> {
  const cfg = config();
  if (!cfg) throw new Error("Storage isn't configured");
  await ensureBucket(cfg.url, cfg.key, name);
  const bucket = BUCKETS[name].id;
  const path = `${folder}/${crypto.randomUUID()}.${format.ext}`;
  const res = await fetch(`${cfg.url}/storage/v1/object/${bucket}/${path}`, {
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
  if (!res.ok) throw await storageError("upload", res);
  return `${cfg.url}/storage/v1/object/public/${bucket}/${path}`;
}

/** A product photo; returns its public URL. */
export function uploadProductImage(
  bytes: Uint8Array,
  format: { ext: string; type: string },
): Promise<string> {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return uploadImage(
    "products",
    `products/${now.getUTCFullYear()}/${month}`,
    bytes,
    format,
  );
}

/** A user's profile picture; returns its public URL. */
export function uploadAvatar(
  userId: string,
  bytes: Uint8Array,
  format: { ext: string; type: string },
): Promise<string> {
  return uploadImage("avatars", userId, bytes, format);
}

/** Whether a URL is one of this project's stored avatars. */
export function isStoredAvatar(url: string | null | undefined): boolean {
  const cfg = config();
  return (
    !!cfg &&
    !!url &&
    url.startsWith(`${cfg.url}/storage/v1/object/public/${BUCKETS.avatars.id}/`)
  );
}

/** Deletes a stored avatar (best effort — a leftover file is harmless). */
export async function deleteAvatar(url: string): Promise<void> {
  const cfg = config();
  if (!cfg || !isStoredAvatar(url)) return;
  const prefix = url.split(`/public/${BUCKETS.avatars.id}/`)[1];
  await fetch(`${cfg.url}/storage/v1/object/${BUCKETS.avatars.id}`, {
    method: "DELETE",
    headers: { ...headers(cfg.key), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [prefix] }),
  }).catch((err) => console.error("Avatar delete failed", err));
}
