import {
  pgTable,
  varchar,
  integer,
  text,
  timestamp,
  pgEnum,
  uuid,
  boolean,
  decimal,
  pgSchema,
  jsonb,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────
// Default Fields (matching your style)
// ─────────────────────────────────────────
const defaultFields = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft deletes
};

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["buyer", "seller", "admin"]);

export const productConditionEnum = pgEnum("product_condition", [
  "new",
  "used",
  "refurbished",
]);

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "suspended",
  "out_of_stock",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "awaiting_pickup",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "under_review",
  "resolved",
  "closed",
]);

export const promotionTypeEnum = pgEnum("promotion_type", ["percent", "fixed"]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "push",
  "sms",
  "email",
]);

export const placementEnum = pgEnum("placement", [
  "homepage",
  "category",
  "search",
]);

export const courierEnum = pgEnum("courier", [
  "sendy",
  "fargo",
  "self",
  "other",
]);

// ─────────────────────────────────────────
// USERS & AUTH
// ─────────────────────────────────────────
export const usersTable = pgTable("users", {
  ...defaultFields,
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  phone: varchar("phone").unique().notNull(),
  passwordHash: varchar("password_hash"),
  profilePhoto: text("profile_photo"),
  role: userRoleEnum("role").notNull().default("buyer"),
  isVerified: boolean("is_verified").notNull().default(false),
});

export const userAddressesTable = pgTable("user_addresses", {
  ...defaultFields,
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  label: varchar("label").notNull().default("home"), // home, work, other
  county: varchar("county").notNull(),
  town: varchar("town").notNull(),
  street: text("street"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").notNull().default(false),
});

export const sellerProfilesTable = pgTable("seller_profiles", {
  ...defaultFields,
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  storeName: varchar("store_name").notNull(),
  storeSlug: varchar("store_slug").unique().notNull(),
  storeDescription: text("store_description"),
  storeLogo: text("store_logo"),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationDocs: text("verification_docs").array(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalSales: integer("total_sales").notNull().default(0),
});

// ─────────────────────────────────────────
// PRODUCTS & CATALOGUE
// ─────────────────────────────────────────
export const categoriesTable = pgTable("categories", {
  ...defaultFields,
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  icon: text("icon"),
  parentId: uuid("parent_id"), // self-referencing for sub-categories
  isActive: boolean("is_active").notNull().default(true),
});

export const productsTable = pgTable("products", {
  ...defaultFields,
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => sellerProfilesTable.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "restrict" }),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  description: text("description"),
  condition: productConditionEnum("condition").notNull().default("new"),
  status: productStatusEnum("status").notNull().default("draft"),
});

export const productVariantsTable = pgTable("product_variants", {
  ...defaultFields,
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  sku: varchar("sku").unique().notNull(),
  size: varchar("size"),
  color: varchar("color"),
  material: varchar("material"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
});

export const productImagesTable = pgTable("product_images", {
  ...defaultFields,
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariantsTable.id, {
    onDelete: "set null",
  }),
  url: text("url").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productTagsTable = pgTable("product_tags", {
  ...defaultFields,
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  tag: varchar("tag").notNull(),
});

// ─────────────────────────────────────────
// CART & ORDERS
// ─────────────────────────────────────────
export const cartsTable = pgTable("carts", {
  ...defaultFields,
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

export const cartItemsTable = pgTable("cart_items", {
  ...defaultFields,
  cartId: uuid("cart_id")
    .notNull()
    .references(() => cartsTable.id, { onDelete: "cascade" }),
  productVariantId: uuid("product_variant_id")
    .notNull()
    .references(() => productVariantsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
});

export const ordersTable = pgTable("orders", {
  ...defaultFields,
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  deliveryAddressId: uuid("delivery_address_id")
    .notNull()
    .references(() => userAddressesTable.id, { onDelete: "restrict" }),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  notes: text("notes"),
});

export const orderItemsTable = pgTable("order_items", {
  ...defaultFields,
  orderId: uuid("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => sellerProfilesTable.id, { onDelete: "restrict" }),
  productVariantId: uuid("product_variant_id")
    .notNull()
    .references(() => productVariantsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
});

// ─────────────────────────────────────────
// DELIVERY & LOGISTICS
// ─────────────────────────────────────────
export const deliveryZonesTable = pgTable("delivery_zones", {
  ...defaultFields,
  name: varchar("name").notNull(),
  county: varchar("county").notNull(),
  estimatedDays: integer("estimated_days").notNull().default(1),
  baseFee: decimal("base_fee", { precision: 10, scale: 2 }).notNull(),
});

export const shipmentsTable = pgTable("shipments", {
  ...defaultFields,
  orderItemId: uuid("order_item_id")
    .notNull()
    .references(() => orderItemsTable.id, { onDelete: "cascade" }),
  courier: courierEnum("courier").notNull().default("self"),
  trackingNumber: varchar("tracking_number"),
  status: shipmentStatusEnum("status").notNull().default("awaiting_pickup"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

export const shipmentEventsTable = pgTable("shipment_events", {
  ...defaultFields,
  shipmentId: uuid("shipment_id")
    .notNull()
    .references(() => shipmentsTable.id, { onDelete: "cascade" }),
  status: shipmentStatusEnum("status").notNull(),
  description: text("description"),
  location: varchar("location"),
  happenedAt: timestamp("happened_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────
// REVIEWS & TRUST
// ─────────────────────────────────────────
export const reviewsTable = pgTable("reviews", {
  ...defaultFields,
  orderItemId: uuid("order_item_id")
    .notNull()
    .references(() => orderItemsTable.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => sellerProfilesTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1–5
  comment: text("comment"),
  isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(true),
});

export const disputesTable = pgTable("disputes", {
  ...defaultFields,
  orderId: uuid("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  raisedBy: uuid("raised_by")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  reason: varchar("reason").notNull(),
  description: text("description"),
  status: disputeStatusEnum("status").notNull().default("open"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// ─────────────────────────────────────────
// PROMOTIONS & VISIBILITY
// ─────────────────────────────────────────
export const promotionsTable = pgTable("promotions", {
  ...defaultFields,
  sellerId: uuid("seller_id").references(() => sellerProfilesTable.id, {
    onDelete: "cascade",
  }), // null = platform-wide
  code: varchar("code").unique().notNull(),
  type: promotionTypeEnum("type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const featuredListingsTable = pgTable("featured_listings", {
  ...defaultFields,
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => sellerProfilesTable.id, { onDelete: "cascade" }),
  placement: placementEnum("placement").notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────
export const notificationsTable = pgTable("notifications", {
  ...defaultFields,
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // order_update, payment, promotion, etc.
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  channel: notificationChannelEnum("channel").notNull().default("push"),
});

// ─────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────

export const paymentsTable = pgTable("payments", {
  ...defaultFields,
  // References ordersTable.id but stored as text to match Daraja's
  // order_id format — keep as varchar if your order IDs are UUIDs.
  orderId: varchar("order_id").unique().notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paid: boolean("paid").notNull().default(false),
  phone: varchar("phone"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  // Daraja access token cached per request to avoid redundant auth calls.
  accessToken: uuid("access_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  // Raw STK push request params and any extra context from your app.
  metadata: jsonb("metadata"),
  // Raw successful callback payload from Safaricom.
  callbackData: jsonb("callback_data"),
});

// Immutable audit trail — one row per callback Safaricom sends.
// Never update or delete rows in this table.
export const paymentLogsTable = pgTable("payment_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: varchar("order_id").notNull(),
  rawCallback: jsonb("raw_callback"),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Stores application-level errors for debugging and alerting.
// Never update or delete rows in this table.
export const errorLogsTable = pgTable("error_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: varchar("endpoint"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  context: jsonb("context"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

export const refreshTokensTable = pgTable("refresh_tokens", {
  ...defaultFields,
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  // Lets us invalidate all tokens for a user on password change or logout all.
  family: uuid("family").notNull().defaultRandom(),
  isRevoked: boolean("is_revoked").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  // Tracks which device/client issued the token for audit purposes.
  userAgent: text("user_agent"),
  ip: varchar("ip"),
});

export const otpTable = pgTable("otps", {
  ...defaultFields,
  phone: varchar("phone").notNull(),
  code: varchar("code").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ─────────────────────────────────────────
// Inferred Types - I moved these to the files in which they are used
// ─────────────────────────────────────────
