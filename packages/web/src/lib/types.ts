// Shapes mirror the rows returned by the server. The server does not join
// related tables, so anything nested (variants, images, product names on
// cart/order items) is fetched separately and composed on the client.

/** Envelope every API endpoint responds with. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// The API sends only what each screen needs (server/src/lib/views.ts):
// no soft-delete markers or update times, no internal foreign keys, and to
// shoppers no store ids or exact stock. Fields marked "owner"/"admin" are
// absent from other audiences' responses.
interface Timestamps {
  createdAt: string;
}

// ─── Users ───────────────────────────────────────────────────────────────────

// "seller": accounts from before seller sign-ups closed. They shop like
// buyers; nobody can become one any more.
export type UserRole = "buyer" | "seller" | "admin";

export interface User extends Timestamps {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  profilePhoto?: string | null;
  isVerified: boolean;
}

export type UserProfile = User;

export interface Address {
  id: string;
  label: string;
  county: string;
  town: string;
  street?: string | null;
  isDefault: boolean;
}

// ─── Seller ───────────────────────────────────────────────────────────────────

/**
 * What buyers can know about a seller: trust signals only. Stores are
 * anonymous — buyers deal with Soko.
 */
export interface PublicSeller {
  isVerified: boolean;
  rating?: string | null;
  totalSales: number;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category extends Timestamps {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  parentId?: string | null;
  isActive: boolean;
}

// ─── Products ────────────────────────────────────────────────────────────────

export type ProductCondition = "new" | "used" | "refurbished";
export type ProductStatus = "draft" | "active" | "suspended" | "out_of_stock";

/** A listing as admins manage it (GET /products/admin…). */
export interface Product extends Timestamps {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
  condition: ProductCondition;
  status: ProductStatus;
}

/** A live listing on its public page: the store summarised, never named. */
export interface PublicProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
  condition: ProductCondition;
  seller: PublicSeller | null;
}

export interface ProductVariant {
  id: string;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  price: string; // decimal
  compareAtPrice?: string | null;
  /** Owner only. */
  sku?: string;
  /** Owner only: the real stock count. */
  stockQuantity?: number;
  /**
   * Shoppers: what they can still add (stock minus other carts' holds),
   * capped by the API so inventory can't be read off it.
   */
  availableQuantity?: number;
}

export interface ProductImage {
  id: string;
  variantId?: string | null;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductTag {
  tag: string;
}

/** A product with its variants and images loaded. */
/** A product as the catalogue lists it: card-ready, one row per product. */
export interface CatalogueItem {
  id: string;
  name: string;
  slug: string;
  condition: ProductCondition;
  /** Cheapest variant's price. */
  price: string;
  compareAtPrice: string | null;
  image: string | null;
  /** Set when the card can add to cart directly: one variant, in stock. */
  variantId: string | null;
  hasOptions: boolean;
  soldOut: boolean;
}

export type CatalogueSort = "newest" | "price_asc" | "price_desc";

export interface ProductWithMedia extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
}

/** Response of GET /products/variants/:variantId */
export interface VariantDetails {
  variant: ProductVariant;
  product: Product;
  primaryImage: ProductImage | null;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  productVariantId: string;
  quantity: number;
  /** What this shopper can have of it (stock not held by others). */
  availableQuantity?: number;
}

/** Cart item with its variant/product resolved, when available. */
export interface CartLine extends CartItem {
  details?: VariantDetails;
}

export interface CartSummary {
  items: CartItem[];
  itemCount: number;
  subtotal: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

/**
 * Shared by orders and items. Items also pass through two hub steps:
 * dropped_off (seller handed it in) and at_hub (the hub received it).
 */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "dropped_off"
  | "at_hub"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Order extends Timestamps {
  id: string;
  /** Admin only. */
  buyerId?: string;
  deliveryAddressId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  deliveryFee: string;
  /** Promo code savings, already taken off totalAmount. */
  discountAmount?: string;
  notes?: string | null;
}

/** A line on an order. Buyers never see which store it's from. */
export interface OrderItem {
  id: string;
  productVariantId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  status: OrderStatus;
}

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
}

/** Response of POST /orders/me */
export interface PlacedOrder {
  orderId: string;
  totalAmount: string;
  deliveryFee: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface Payment extends Timestamps {
  id: string;
  orderId: string;
  status: PaymentStatus;
  paid: boolean;
  phone?: string | null;
  amount?: string | null;
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

export type Courier = "sendy" | "fargo" | "self" | "other";

export type ShipmentStatus =
  | "awaiting_pickup"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export interface DeliveryZone extends Timestamps {
  id: string;
  name: string;
  county: string;
  estimatedDays: number;
  baseFee: string;
}

/** One per order, sent from the Soko hub. */
export interface Shipment extends Timestamps {
  id: string;
  orderId: string;
  courier: Courier;
  trackingNumber?: string | null;
  status: ShipmentStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface ShipmentEvent extends Timestamps {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  description?: string | null;
  location?: string | null;
  happenedAt: string;
}

export interface ShipmentTimeline {
  shipment: Shipment;
  events: ShipmentEvent[];
  latestEvent: ShipmentEvent | null;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review extends Timestamps {
  id: string;
  /** The reviewer's own reviews only. */
  orderItemId?: string;
  productId?: string;
  rating: number;
  comment?: string | null;
  isVerifiedPurchase: boolean;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationChannel = "push" | "sms" | "email";

export interface Notification extends Timestamps {
  id: string;
  type: string; // order_update, payment, promotion, ...
  title: string;
  body: string;
  isRead: boolean;
  channel: NotificationChannel;
}
