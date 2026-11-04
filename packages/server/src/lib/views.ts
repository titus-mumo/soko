// What each audience may see of each record. Routes pass database rows
// through these before responding, so a new column never reaches a browser
// by accident: fields are allowlisted, not filtered out.
//
// Audiences:
//   public  — anyone, including competitors and scrapers. Stores are
//             anonymous to buyers (no seller ids), exact stock is hidden.
//   self    — the signed-in user's own records (no internal foreign keys).
//   seller  — a seller's own listings, orders and promotions.
// Admin routes return full rows; the global backstop in app.ts still strips
// soft-delete markers, timestamps nobody reads, and password hashes.

type Row = Record<string, any>;

function pick<K extends string>(row: Row, keys: readonly K[]): Record<K, any> {
  const out = {} as Record<K, any>;
  for (const k of keys) if (k in row) out[k] = row[k];
  return out;
}

const viewOf =
  <K extends string>(keys: readonly K[]) =>
  (row: Row) =>
    pick(row, keys);

/**
 * Stock shown to shoppers is capped, so the API can't be used to read a
 * store's inventory. Real limits are still enforced on add-to-cart.
 */
export const STOCK_SHOWN_MAX = 20;
export const shownStock = (n: number) =>
  Math.max(0, Math.min(n, STOCK_SHOWN_MAX));

// ─── Users ───────────────────────────────────────────────────────────────────

/** A search hit when an admin picks who to message. */
export const userPick = viewOf([
  "id",
  "name",
  "email",
  "phone",
  "profilePhoto",
  "role",
] as const);

/** The signed-in user, as returned by /users/me and every auth response. */
export const selfUser = viewOf([
  "id",
  "name",
  "email",
  "phone",
  "profilePhoto",
  "role",
  "isVerified",
  "createdAt",
] as const);

export const selfAddress = viewOf([
  "id",
  "label",
  "county",
  "town",
  "street",
  "isDefault",
] as const);

// ─── Catalogue ───────────────────────────────────────────────────────────────

export const publicCategory = viewOf([
  "id",
  "name",
  "slug",
  "icon",
  "parentId",
] as const);

export const publicZone = viewOf([
  "id",
  "name",
  "county",
  "estimatedDays",
  "baseFee",
] as const);

/** A product page's product. The store is summarised, never identified. */
export function publicProduct(
  product: Row,
  seller?: {
    isVerified: boolean;
    rating: string | null;
    totalSales: number;
  } | null,
) {
  return {
    ...pick(product, [
      "id",
      "name",
      "slug",
      "description",
      "condition",
      "categoryId",
    ] as const),
    seller: seller
      ? {
          isVerified: seller.isVerified,
          rating: seller.rating,
          totalSales: seller.totalSales,
        }
      : null,
  };
}

/** A variant for shoppers: options and price; stock capped, no SKU. */
export function publicVariant(v: Row) {
  return {
    ...pick(v, [
      "id",
      "size",
      "color",
      "material",
      "price",
      "compareAtPrice",
    ] as const),
    availableQuantity: shownStock(v.availableQuantity ?? v.stockQuantity ?? 0),
  };
}

export const publicImage = viewOf([
  "id",
  "url",
  "variantId",
  "isPrimary",
  "sortOrder",
] as const);

export const publicTag = viewOf(["tag"] as const);

/** GET /products/variants/:id — enough to label a cart or order line. */
export function publicVariantDetails(d: {
  variant: Row;
  product: Row;
  primaryImage: Row | null;
}) {
  return {
    variant: publicVariant(d.variant),
    product: pick(d.product, ["id", "name", "slug"] as const),
    primaryImage: d.primaryImage
      ? pick(d.primaryImage, ["url"] as const)
      : null,
  };
}

// ─── Seller's own listings ───────────────────────────────────────────────────

export const ownerProduct = viewOf([
  "id",
  "categoryId",
  "name",
  "slug",
  "description",
  "condition",
  "status",
  "createdAt",
] as const);

export const ownerVariant = viewOf([
  "id",
  "sku",
  "size",
  "color",
  "material",
  "price",
  "compareAtPrice",
  "stockQuantity",
] as const);

// ─── Reviews ─────────────────────────────────────────────────────────────────

/** Anyone's review, shown on a product: no reviewer, order or store ids. */
export const publicReview = viewOf([
  "id",
  "rating",
  "comment",
  "isVerifiedPurchase",
  "createdAt",
] as const);

/** The reviewer's own review: plus what it's about, so they can edit it. */
export const ownReview = viewOf([
  "id",
  "orderItemId",
  "productId",
  "rating",
  "comment",
  "isVerifiedPurchase",
  "createdAt",
] as const);

// ─── Cart, orders, payments, delivery ────────────────────────────────────────

export function cartItem(i: Row) {
  return {
    ...pick(i, ["id", "productVariantId", "quantity"] as const),
    ...(i.availableQuantity !== undefined && {
      availableQuantity: shownStock(i.availableQuantity),
    }),
  };
}

/** A seller's own listing with everything they edit. */
export function ownerListing(p: Row) {
  return {
    ...ownerProduct(p),
    ...(p.unitsSold !== undefined && { unitsSold: p.unitsSold }),
    ...(p.variants && { variants: p.variants.map(ownerVariant) }),
    ...(p.images && { images: p.images.map(publicImage) }),
    ...(p.tags && { tags: p.tags }),
  };
}

export const buyerOrder = viewOf([
  "id",
  "status",
  "paymentStatus",
  "totalAmount",
  "deliveryFee",
  "deliveryAddressId",
  "notes",
  "createdAt",
] as const);

/** A line on the buyer's order. No store id: one order, shipped by Soko. */
export const buyerOrderItem = viewOf([
  "id",
  "productVariantId",
  "quantity",
  "unitPrice",
  "subtotal",
  "status",
] as const);

/** A line the seller has to fulfil. No buyer details: the hub ships. */
export const sellerOrderItem = viewOf([
  "id",
  "orderId",
  "productVariantId",
  "quantity",
  "unitPrice",
  "subtotal",
  "status",
  "createdAt",
] as const);

/** Payment status for the buyer. M-Pesa tokens and raw callbacks stay here. */
export const buyerPayment = viewOf([
  "id",
  "orderId",
  "status",
  "paid",
  "phone",
  "amount",
  "createdAt",
] as const);

export const shipmentView = viewOf([
  "id",
  "courier",
  "trackingNumber",
  "status",
  "shippedAt",
  "deliveredAt",
] as const);

export const shipmentEvent = viewOf([
  "id",
  "status",
  "description",
  "location",
  "happenedAt",
] as const);

export function shipmentTracking(t: {
  shipment: Row;
  events: Row[];
  latestEvent?: Row | null;
}) {
  return {
    shipment: shipmentView(t.shipment),
    events: t.events.map(shipmentEvent),
    latestEvent: t.latestEvent ? shipmentEvent(t.latestEvent) : null,
  };
}

// ─── Disputes, notifications, promotions ─────────────────────────────────────

export const buyerDispute = viewOf([
  "id",
  "orderId",
  "reason",
  "description",
  "status",
  "resolution",
  "resolvedAt",
  "createdAt",
] as const);

export const notificationView = viewOf([
  "id",
  "type",
  "title",
  "body",
  "isRead",
  "channel",
  "createdAt",
] as const);

export const sellerPromotion = viewOf([
  "id",
  "code",
  "type",
  "value",
  "minOrderAmount",
  "maxUses",
  "usesCount",
  "isActive",
  "expiresAt",
  "createdAt",
] as const);

// ─── Backstop ────────────────────────────────────────────────────────────────

const NEVER_SENT = new Set(["deletedAt", "updatedAt", "passwordHash"]);

/**
 * Strips fields no response should carry, at any depth. Applied to every
 * JSON response in app.ts as a safety net under the views above.
 */
export function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const out: Row = {};
    for (const [k, v] of Object.entries(value))
      if (!NEVER_SENT.has(k)) out[k] = scrub(v);
    return out;
  }
  return value;
}
