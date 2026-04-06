import { getRepositories } from "../lib/repositories";

const {
  orderRepository,
  orderItemRepository,
  cartItemRepository,
  cartRepository,
  productVariantRepository,
  deliveryZoneRepository,
  userAddressRepository,
  sellerProfileRepository,
  notificationRepository,
} = getRepositories();

// ─────────────────────────────────────────
// Place Order
// ─────────────────────────────────────────

export async function placeOrder(
  userId: string,
  data: {
    deliveryAddressId: string;
    notes?: string;
    promotionCode?: string;
  },
): Promise<
  | "cart_empty"
  | "cart_not_found"
  | "address_not_found"
  | "delivery_zone_not_found"
  | "insufficient_stock"
  | "variant_not_found"
  | { orderId: string; totalAmount: string; deliveryFee: string }
> {
  // Fetch the user's cart.
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart === "cart_not_found") return "cart_not_found";

  const cartItems = await cartItemRepository.findItemsByCartId(cart.id);
  if (cartItems.length === 0) return "cart_empty";

  // Confirm the delivery address belongs to the user.
  const address = await userAddressRepository.findAddressById(
    data.deliveryAddressId,
    userId,
  );
  if (address === "address_not_found") return "address_not_found";

  // Resolve the delivery zone from the address county.
  const zones = await deliveryZoneRepository.findZonesByCounty(address.county);
  if (zones.length === 0) return "delivery_zone_not_found";

  // Use the first matched zone — extend this for multiple zone selection.
  const zone = zones[0];
  const deliveryFee = parseFloat(zone.baseFee);

  // Validate stock and compute subtotal for each cart item.
  let subtotal = 0;
  const orderItemsData = [];

  for (const item of cartItems) {
    const variant = await productVariantRepository.findVariantById(
      item.productVariantId,
    );

    if (variant === "variant_not_found") return "variant_not_found";
    if (variant.stockQuantity < item.quantity) return "insufficient_stock";

    const unitPrice = parseFloat(variant.price);
    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;

    // Fetch seller profile for this variant's product.
    const seller = await sellerProfileRepository.findSellerProfileById(
      variant.productId,
    );

    orderItemsData.push({
      sellerId: (seller as any).id,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      subtotal: itemSubtotal.toFixed(2),
      status: "pending" as const,
    });
  }

  const totalAmount = (subtotal + deliveryFee).toFixed(2);

  // Insert the order record.
  const order = await orderRepository.insertOrder({
    buyerId: userId,
    deliveryAddressId: data.deliveryAddressId,
    status: "pending",
    paymentStatus: "pending",
    totalAmount,
    deliveryFee: deliveryFee.toFixed(2),
    notes: data.notes,
  });

  if (!order) throw new Error("Failed to create order");

  // Insert all order items in one round trip.
  await orderItemRepository.insertOrderItems(
    orderItemsData.map((item) => ({
      orderId: order.id,
      ...item,
    })),
  );

  // Deduct stock for each variant atomically.
  await Promise.all(
    cartItems.map((item) =>
      productVariantRepository.adjustStock(
        item.productVariantId,
        -item.quantity,
      ),
    ),
  );

  // Clear the cart after successful order placement.
  await cartItemRepository.softDeleteItemsByCartId(cart.id);

  // Notify the buyer.
  await notificationRepository.insertNotification({
    userId,
    type: "order_placed",
    title: "Order Placed!",
    body: `Your order #${order.id.slice(0, 8)} has been placed successfully.`,
    channel: "push",
  });

  return {
    orderId: order.id,
    totalAmount,
    deliveryFee: deliveryFee.toFixed(2),
  };
}

// ─────────────────────────────────────────
// Buyer
// ─────────────────────────────────────────

export async function getBuyerOrders(userId: string) {
  return await orderRepository.findOrdersByBuyerId(userId);
}

export async function getBuyerOrderById(userId: string, orderId: string) {
  const order = await orderRepository.findOrderByIdAndBuyerId(orderId, userId);
  if (order === "order_not_found") return "order_not_found" as const;

  const items = await orderItemRepository.findItemsByOrderId(orderId);

  return { order, items };
}

export async function cancelOrder(
  userId: string,
  orderId: string,
): Promise<"order_not_found" | "order_not_cancellable" | "order_cancelled"> {
  const order = await orderRepository.findOrderByIdAndBuyerId(orderId, userId);
  if (order === "order_not_found") return "order_not_found";

  // Only pending or confirmed orders can be cancelled by the buyer.
  if (!["pending", "confirmed"].includes(order.status)) {
    return "order_not_cancellable";
  }

  // Restore stock for each order item.
  const items = await orderItemRepository.findItemsByOrderId(orderId);
  await Promise.all(
    items.map((item) =>
      productVariantRepository.adjustStock(
        item.productVariantId,
        item.quantity,
      ),
    ),
  );

  await orderRepository.updateOrderAndPaymentStatus(
    orderId,
    "cancelled",
    "refunded",
  );

  // Update all order items to cancelled.
  await orderItemRepository.updateStatusByOrderId(orderId, "cancelled");

  await notificationRepository.insertNotification({
    userId,
    type: "order_cancelled",
    title: "Order Cancelled",
    body: `Your order #${orderId.slice(0, 8)} has been cancelled.`,
    channel: "push",
  });

  return "order_cancelled";
}

// ─────────────────────────────────────────
// Seller
// ─────────────────────────────────────────

export async function getSellerOrderItems(sellerId: string) {
  return await orderItemRepository.findItemsBySellerId(sellerId);
}

export async function getSellerOrderItemsByStatus(
  sellerId: string,
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded",
) {
  return await orderItemRepository.findItemsBySellerIdAndStatus(
    sellerId,
    status,
  );
}

export async function updateOrderItemStatus(
  sellerId: string,
  orderItemId: string,
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded",
): Promise<"order_item_not_found" | "status_updated"> {
  const result = await orderItemRepository.updateOrderItemStatus(
    orderItemId,
    sellerId,
    status,
  );

  if (result === "order_item_not_found") return "order_item_not_found";

  // Notify the buyer when the seller advances the item status.
  const orderItem = result;
  await notificationRepository.insertNotification({
    userId: (orderItem as any).buyerId,
    type: "order_update",
    title: "Order Update",
    body: `An item in your order #${orderItem.orderId.slice(0, 8)} is now ${status}.`,
    channel: "push",
  });

  return "status_updated";
}

// ─────────────────────────────────────────
// Admin
// ─────────────────────────────────────────

export async function getOrdersByStatus(
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded",
) {
  return await orderRepository.findOrdersByStatus(status);
}

export async function getOrdersByPaymentStatus(
  paymentStatus: "pending" | "paid" | "failed" | "refunded",
) {
  return await orderRepository.findOrdersByPaymentStatus(paymentStatus);
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded",
): Promise<"order_not_found" | "status_updated"> {
  const result = await orderRepository.updateOrderStatus(orderId, status);
  if (result === "order_not_found") return "order_not_found";
  return "status_updated";
}
