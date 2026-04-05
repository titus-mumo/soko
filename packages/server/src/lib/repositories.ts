import {
  UserRepository,
  UserAddressRepository,
  SellerProfileRepository,
  CategoryRepository,
  ProductRepository,
  ProductVariantRepository,
  ProductImageRepository,
  ProductTagRepository,
  CartRepository,
  CartItemRepository,
  OrderRepository,
  OrderItemRepository,
  DeliveryZoneRepository,
  ShipmentRepository,
  ShipmentEventRepository,
  ReviewRepository,
  DisputeRepository,
  PromotionRepository,
  FeaturedListingRepository,
  NotificationRepository,
  PaymentRepository,
  PaymentLogRepository,
  ErrorLogRepository,
  RefreshTokenRepository,
  OtpRepository,
} from "db-operations";

// Instantiated once and reused across the entire server lifetime.
const repositories = {
  // Users
  userRepository: new UserRepository(),
  userAddressRepository: new UserAddressRepository(),
  sellerProfileRepository: new SellerProfileRepository(),

  //auth
  refreshTokenRepository: new RefreshTokenRepository(),
  otpRepository: new OtpRepository(),

  // Products
  categoryRepository: new CategoryRepository(),
  productRepository: new ProductRepository(),
  productVariantRepository: new ProductVariantRepository(),
  productImageRepository: new ProductImageRepository(),
  productTagRepository: new ProductTagRepository(),

  // Cart
  cartRepository: new CartRepository(),
  cartItemRepository: new CartItemRepository(),

  // Orders
  orderRepository: new OrderRepository(),
  orderItemRepository: new OrderItemRepository(),

  // Delivery
  deliveryZoneRepository: new DeliveryZoneRepository(),
  shipmentRepository: new ShipmentRepository(),
  shipmentEventRepository: new ShipmentEventRepository(),

  // Reviews & Disputes
  reviewRepository: new ReviewRepository(),
  disputeRepository: new DisputeRepository(),

  // Promotions
  promotionRepository: new PromotionRepository(),
  featuredListingRepository: new FeaturedListingRepository(),

  // Notifications
  notificationRepository: new NotificationRepository(),

  // Payments
  paymentRepository: new PaymentRepository(),
  paymentLogRepository: new PaymentLogRepository(),
  errorLogRepository: new ErrorLogRepository(),
};

export function getRepositories() {
  return repositories;
}

// Convenience type for services that destructure from getRepositories().
export type Repositories = typeof repositories;
