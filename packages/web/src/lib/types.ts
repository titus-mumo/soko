// ─── Products ────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id: string;
  sku: string;
  price: string; // server returns price as string (decimal)
  stockQuantity: number;
  size?: string;
  color?: string;
  material?: string;
  compareAtPrice?: string;
}

export type ProductCondition = "new" | "used" | "refurbished";

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  category?: Category;
  condition: ProductCondition;
  variants: ProductVariant[];
  images: ProductImage[];
  tags: string[];
  sellerId: string;
  seller?: SellerProfile;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: Category[];
  productCount?: number;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  productVariantId: string;
  variant?: ProductVariant & { product?: Product };
  quantity: number;
  // computed helper — may or may not be returned by server
  product?: Product;
  price?: number;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  id: string;
  productVariantId: string;
  variant?: ProductVariant & { product?: Product };
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface DeliveryAddress {
  street?: string;
  town: string;
  county: string;
}

export interface Order {
  id: string;
  buyerId: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: string;
  deliveryFee: string;
  discount: string;
  total: string;
  deliveryAddress?: DeliveryAddress;
  paymentStatus: PaymentStatus;
  promotionCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "order"
  | "payment"
  | "delivery"
  | "system"
  | "promotion";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ─── Profile & Addresses ─────────────────────────────────────────────────────

export interface Address {
  id: string;
  label: string;
  street?: string;
  town: string;
  county: string;
  latitude?: string;
  longitude?: string;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  profilePhoto?: string;
  createdAt: string;
}

// ─── Seller ───────────────────────────────────────────────────────────────────

export interface SellerProfile {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  storeDescription?: string;
  storeLogo?: string;
  isVerified: boolean;
  rating?: number;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface MpesaPaymentInitiation {
  checkoutRequestId: string;
  merchantRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}
