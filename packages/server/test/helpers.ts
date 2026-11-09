// Test helpers: an in-process HTTP client for the Elysia app, factories for
// users / stores / products / orders, and cleanup that hard-deletes exactly
// what a test file created.
import { expect } from "bun:test";
import { CALLBACK_PATH } from "./setup";
import postgres from "postgres";
import App from "../src/app";
import { getRepositories } from "../src/lib/repositories";

export const RUN = process.env.TEST_RUN!;
export const PASSWORD = "Passw0rd!";

// ─── HTTP ────────────────────────────────────────────────────────────────────

export interface ApiResult<T = any> {
  status: number;
  body: T;
  headers: Headers;
  /** `soko_refresh=…` from Set-Cookie, ready to send back as a Cookie header. */
  refreshCookie: string | null;
}

/** Sends a request through the app without opening a port. */
export async function api<T = any>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; cookie?: string } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";

  const res = await App.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      redirect: "manual",
    }),
  );

  const text = await res.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON (e.g. plain text error)
  }

  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/soko_refresh=([^;]*)/);
  return {
    status: res.status,
    body,
    headers: res.headers,
    refreshCookie: match && match[1] ? `soko_refresh=${match[1]}` : null,
  };
}

/** Asserts a status and returns the body's `data`, for terse happy paths. */
export function ok<T = any>(res: ApiResult, status = 200): T {
  if (res.status !== status) {
    // Show the server's message when an assertion fails.
    expect({ status: res.status, body: res.body }).toEqual({
      status,
      body: expect.anything(),
    });
  }
  return res.body?.data as T;
}

// ─── Tracking & cleanup ──────────────────────────────────────────────────────

// Cleanup runs on its own connection with prepared statements off. Running it
// through the app's shared drizzle pool stalled after some requests (server
// stuck in ClientRead on the prepared cleanup statement), while app traffic on
// that pool kept working — so keep test bookkeeping off the app's pool.
let cleanupClient: postgres.Sql | null = null;
function cleanupDb() {
  cleanupClient ??= postgres(Bun.env.DB_URL!, { max: 1, prepare: false });
  return cleanupClient;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROMO_CODE = /^[A-Z0-9-]{3,40}$/;

/**
 * Ages a user's cart lines past the hold window, as if they'd left their
 * cart alone for hours — without waiting for real.
 */
export async function expireCartHolds(userId: string) {
  if (!UUID.test(userId)) throw new Error(`unsafe user id: ${userId}`);
  await cleanupDb().unsafe(
    `UPDATE cart_items SET updated_at = now() - interval '1 day'
     WHERE cart_id IN (SELECT id FROM carts WHERE user_id = '${userId}')`,
  );
}

/** Everything a test file creates, so afterAll can remove exactly that. */
export class Tracker {
  userIds = new Set<string>();
  categoryIds = new Set<string>();
  zoneIds = new Set<string>();
  promoCodes = new Set<string>();
  // Products live in the shared house store (not a tracked user's), so
  // they're tracked themselves.
  productIds = new Set<string>();

  async cleanup() {
    const q = cleanupDb();
    // Values are inlined as literals (no bind parameters); each is strictly
    // validated first, so this can't inject SQL.
    const list = (values: string[], pattern = UUID) =>
      values
        .map((v) => {
          if (!pattern.test(v)) throw new Error(`unsafe cleanup value: ${v}`);
          return `'${v}'`;
        })
        .join(", ");

    const users = [...this.userIds];
    const products = [...this.productIds];
    // Orders block user and product deletion (RESTRICT) — remove them first:
    // these users' orders, orders with these users' stores, and orders for
    // these products.
    const u = users.length ? list(users) : "NULL";
    const p = products.length ? list(products) : "NULL";
    if (users.length || products.length) {
      const orders = await q.unsafe<{ id: string }[]>(`
        select o.id from orders o
        where o.buyer_id in (${u})
           or o.id in (
             select oi.order_id from order_items oi
             join seller_profiles sp on sp.id = oi.seller_id
             where sp.user_id in (${u})
           )
           or o.id in (
             select oi.order_id from order_items oi
             join product_variants pv on pv.id = oi.product_variant_id
             where pv.product_id in (${p})
           )`);
      if (orders.length) {
        const o = list(orders.map((r) => r.id));
        await q.unsafe(`delete from payment_logs where order_id in (${o})`);
        await q.unsafe(`delete from payments where order_id in (${o})`);
        await q.unsafe(`delete from orders where id in (${o})`);
      }
    }
    if (users.length) {
      // Cascades: addresses, stores → products/variants/images/promotions,
      // carts, reviews, disputes, notifications, refresh tokens.
      await q.unsafe(`delete from users where id in (${u})`);
    }
    if (products.length) {
      // Cascades: variants (→ cart lines), images, tags, reviews.
      await q.unsafe(`delete from products where id in (${p})`);
    }

    const codes = [...this.promoCodes];
    if (codes.length) {
      await q.unsafe(
        `delete from promotions where code in (${list(codes, PROMO_CODE)})`,
      );
    }
    const cats = [...this.categoryIds];
    if (cats.length) {
      const c = list(cats);
      await q.unsafe(`delete from categories where parent_id in (${c})`);
      await q.unsafe(`delete from categories where id in (${c})`);
    }
    const zones = [...this.zoneIds];
    if (zones.length) {
      await q.unsafe(`delete from delivery_zones where id in (${list(zones)})`);
    }
  }
}

// ─── Factories ───────────────────────────────────────────────────────────────

let seq = 0;
const next = () => `${RUN}${(++seq).toString(36)}`;

/** A Kenyan mobile number unlikely to collide with real data. */
export function testPhone(): string {
  const digits = String(Math.floor(Math.random() * 1e7)).padStart(7, "0");
  return `+2547${digits}9`;
}

export interface TestUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  token: string;
  refreshCookie: string;
}

/** Registers a buyer through the real /auth/register endpoint. */
export async function createUser(
  t: Tracker,
  label = "buyer",
  phone = testPhone(),
): Promise<TestUser> {
  const email = `${label}.${next()}@test.soko.local`;
  const name = `Test ${label}`;
  const res = await api("POST", "/auth/register", {
    body: { name, email, phone, password: PASSWORD },
  });
  const data = ok<{ user: { id: string }; accessToken: string }>(res, 201);
  t.userIds.add(data.user.id);
  return {
    id: data.user.id,
    email,
    phone,
    name,
    token: data.accessToken,
    refreshCookie: res.refreshCookie!,
  };
}

/** Re-login to get a token carrying the user's current role. */
export async function login(email: string, password = PASSWORD) {
  const res = await api("POST", "/auth/login", { body: { email, password } });
  return ok<{ accessToken: string; user: { id: string; role: string } }>(res);
}

/** There's no API to become admin, so promote directly then sign in again. */
export async function createAdmin(t: Tracker): Promise<TestUser> {
  const user = await createUser(t, "admin");
  await getRepositories().userRepository.updateUserRole(user.id, "admin");
  const { accessToken } = await login(user.email);
  return { ...user, token: accessToken };
}

export interface TestSeller extends TestUser {
  sellerId: string;
  storeSlug: string;
}

/**
 * A store from before seller sign-ups closed: there's no API to create one
 * any more, so it's inserted directly (role seller, with its store record).
 */
export async function createSeller(t: Tracker): Promise<TestSeller> {
  const user = await createUser(t, "seller");
  const storeSlug = `test-store-${next()}`;
  const { sellerProfileRepository, userRepository } = getRepositories();
  await userRepository.updateUserRole(user.id, "seller");
  const profile = await sellerProfileRepository.insertSellerProfile({
    userId: user.id,
    storeName: `Test Store ${RUN}`,
    storeSlug,
  });
  const { accessToken } = await login(user.email);
  return { ...user, token: accessToken, sellerId: profile!.id, storeSlug };
}

export async function createCategory(
  t: Tracker,
  admin: TestUser,
  extra: { parentId?: string } = {},
) {
  const slug = `test-cat-${next()}`;
  const res = await api("POST", "/categories", {
    token: admin.token,
    body: { name: `Test Category ${slug}`, slug, ...extra },
  });
  const cat = ok<{ id: string; slug: string }>(res, 201);
  t.categoryIds.add(cat.id);
  return cat;
}

export async function createZone(t: Tracker, admin: TestUser) {
  const county = `Testcounty${next()}`;
  const res = await api("POST", "/delivery/admin/zones", {
    token: admin.token,
    body: {
      name: `Zone ${county}`,
      county,
      estimatedDays: 2,
      baseFee: "150.00",
    },
  });
  const zone = ok<{ id: string; county: string }>(res, 201);
  t.zoneIds.add(zone.id);
  return zone;
}

export interface TestProduct {
  id: string;
  slug: string;
  variantId: string;
  imageId: string;
  price: number;
}

/**
 * An admin lists and publishes a product (one variant, one image) — it goes
 * to the house store. Pass `store` to move it to an older store's record,
 * for tests about orders spanning several stores.
 */
export async function createProduct(
  t: Tracker,
  admin: TestUser,
  categoryId: string,
  opts: {
    price?: number;
    stock?: number;
    publish?: boolean;
    store?: TestSeller;
  } = {},
): Promise<TestProduct> {
  const price = opts.price ?? 1000;
  const stock = opts.stock ?? 10;
  const slug = `test-product-${next()}`;
  const res = await api("POST", "/products", {
    token: admin.token,
    body: {
      name: `Test Product ${slug}`,
      slug,
      categoryId,
      description: "A product created by the test suite.",
      condition: "new",
      variants: [
        { sku: `SKU-${slug}`, price: price.toFixed(2), stockQuantity: stock },
      ],
      images: [{ url: `https://picsum.photos/seed/${slug}/400` }],
      tags: ["test", "suite"],
    },
  });
  const created = ok<{
    product: { id: string };
    variants: { id: string }[];
    images: { id: string }[];
  }>(res, 201);
  t.productIds.add(created.product.id);
  if (opts.store) {
    await cleanupDb().unsafe(
      `update products set seller_id = $1 where id = $2`,
      [opts.store.sellerId, created.product.id],
    );
  }
  if (opts.publish !== false) {
    ok(
      await api("PATCH", `/products/${created.product.id}/publish`, {
        token: admin.token,
      }),
    );
  }
  return {
    id: created.product.id,
    slug,
    variantId: created.variants[0].id,
    imageId: created.images[0].id,
    price,
  };
}

export async function createAddress(user: TestUser, county: string) {
  const res = await api("POST", "/users/me/addresses", {
    token: user.token,
    body: { label: "home", county, town: "Testville", isDefault: true },
  });
  return ok<{ id: string }>(res, 201);
}

export const MARKET_STOCK = 45;

/** A complete marketplace: an admin with a live product, and a buyer. */
export async function createMarket(t: Tracker) {
  const admin = await createAdmin(t);
  const buyer = await createUser(t, "buyer");
  const category = await createCategory(t, admin);
  const zone = await createZone(t, admin);
  // Enough stock for a suite's worth of orders (MARKET_STOCK < 50 so the
  // cart's over-stock checks still trip).
  const product = await createProduct(t, admin, category.id, {
    stock: MARKET_STOCK,
  });
  const address = await createAddress(buyer, zone.county);
  return { admin, buyer, category, zone, product, address };
}

export type Market = Awaited<ReturnType<typeof createMarket>>;

/** Adds `quantity` of the market product to the buyer's cart and checks out. */
export async function placeOrder(m: Market, quantity = 1) {
  ok(
    await api("POST", "/cart", {
      token: m.buyer.token,
      body: { productVariantId: m.product.variantId, quantity },
    }),
    201,
  );
  const res = await api("POST", "/orders/me", {
    token: m.buyer.token,
    body: { deliveryAddressId: m.address.id },
  });
  const placed = ok<{ orderId: string; totalAmount: string }>(res, 201);
  const detail = ok<{ items: { id: string }[] }>(
    await api("GET", `/orders/me/${placed.orderId}`, { token: m.buyer.token }),
  );
  return {
    orderId: placed.orderId,
    orderItemId: detail.items[0].id,
    total: placed.totalAmount,
  };
}

/** Pays for an order through the real M-Pesa flow: STK push, then a success callback. */
export async function payOrder(m: Market, orderId: string) {
  ok(
    await api("POST", "/payments/me/initiate", {
      token: m.buyer.token,
      body: { orderId, phone: m.buyer.phone },
    }),
  );
  const { getRepositories } = await import("../src/lib/repositories");
  const payment =
    await getRepositories().paymentRepository.findPaymentByOrderId(orderId);
  if (payment === "payment_not_found") throw new Error("no payment");
  const checkoutRequestId = (payment.metadata as { CheckoutRequestID: string })
    .CheckoutRequestID;
  await api("POST", CALLBACK_PATH, {
    body: {
      Body: {
        stkCallback: {
          MerchantRequestID: `mock-merchant-${checkoutRequestId}`,
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 1 },
              {
                Name: "MpesaReceiptNumber",
                Value: `TST${orderId.slice(0, 6)}`,
              },
              { Name: "PhoneNumber", Value: 254712345678 },
            ],
          },
        },
      },
    },
  });
}

/** Places and pays for an order. */
export async function placePaidOrder(m: Market, quantity = 1) {
  const placed = await placeOrder(m, quantity);
  await payOrder(m, placed.orderId);
  return placed;
}

/**
 * Takes a paid order all the way through the hub: Soko receives the item,
 * ships the order and marks it delivered. Returns the shipment id.
 */
export async function deliverOrder(
  m: Market,
  placed: { orderId: string; orderItemId: string },
) {
  ok(
    await api("PATCH", `/orders/admin/items/${placed.orderItemId}/received`, {
      token: m.admin.token,
    }),
  );
  const shipment = ok<{ id: string }>(
    await api("POST", `/delivery/admin/orders/${placed.orderId}/shipment`, {
      token: m.admin.token,
      body: { courier: "self" },
    }),
    201,
  );
  ok(
    await api("PATCH", `/delivery/admin/shipments/${shipment.id}/status`, {
      token: m.admin.token,
      body: { status: "delivered" },
    }),
  );
  return shipment.id;
}

/** A random UUID that won't exist — for 404 paths. */
export const missingId = () => crypto.randomUUID();
