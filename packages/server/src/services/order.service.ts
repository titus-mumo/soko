import { getRepositories } from "../lib/repositories";
import { isActive, notifyBuyer, orderRef, syncOrderStatus } from "./fulfilment";
import type { OrderItem, OrderStatus, PageParams } from "db-operations";

const {
  orderRepository,
  orderItemRepository,
  cartItemRepository,
  cartRepository,
  productVariantRepository,
  productRepository,
  deliveryZoneRepository,
  userAddressRepository,
  sellerProfileRepository,
  notificationRepository,
  shipmentRepository,
  userRepository,
  stockRepository,
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
  | { insufficientStock: true; variantId: string; available: number }
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

    const unitPrice = parseFloat(variant.price);
    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;

    // The seller is on the product, not the variant.
    const product = await productRepository.findProductById(variant.productId);
    if (product === "product_not_found") return "variant_not_found";

    orderItemsData.push({
      sellerId: product.sellerId,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      subtotal: itemSubtotal.toFixed(2),
      status: "pending" as const,
    });
  }

  const totalAmount = (subtotal + deliveryFee).toFixed(2);

  // Take the stock first, all lines or none, in one locked transaction: no
  // two checkouts can both get the last unit, and other shoppers' cart
  // holds are respected (the buyer's own hold is theirs to use).
  const taken = await stockRepository.takeForOrder(
    userId,
    cartItems.map((i) => ({
      variantId: i.productVariantId,
      quantity: i.quantity,
    })),
  );
  if (!taken.ok) {
    if (taken.reason === "variant_not_found") return "variant_not_found";
    return {
      insufficientStock: true,
      variantId: taken.variantId!,
      available: taken.reason === "insufficient_stock" ? taken.available : 0,
    };
  }
  const returnStock = () =>
    Promise.all(
      cartItems.map((i) =>
        productVariantRepository.adjustStock(i.productVariantId, i.quantity),
      ),
    );

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

  if (!order) {
    await returnStock();
    throw new Error("Failed to create order");
  }

  // Insert all order items in one round trip. If that fails, don't leave
  // an empty order behind.
  try {
    await orderItemRepository.insertOrderItems(
      orderItemsData.map((item) => ({
        orderId: order.id,
        ...item,
      })),
    );
  } catch (err) {
    await orderRepository.softDeleteOrder(order.id);
    await returnStock();
    throw err;
  }

  // Clear the cart after successful order placement.
  await cartItemRepository.softDeleteItemsByCartId(cart.id);

  // Notify the buyer.
  await notificationRepository.insertNotification({
    userId,
    type: "order_placed",
    title: "Order Placed!",
    body: `Your order ${orderRef(order.id)} has been placed successfully.`,
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

/** Order counts for the buyer's dashboard. */
export async function getBuyerOrderStats(userId: string) {
  return await orderRepository.buyerStats(userId);
}

export async function getBuyerOrders(
  userId: string,
  page?: PageParams,
  status?: OrderStatus,
) {
  return await orderRepository.pageOrdersByBuyerId(userId, page, status);
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
    body: `Your order ${orderRef(orderId)} has been cancelled.`,
    channel: "push",
  });

  return "order_cancelled";
}

// ─────────────────────────────────────────
// Seller
// ─────────────────────────────────────────

// Routes pass the authenticated user's id, but order items reference the
// seller profile id. Returns null when the user has no seller profile.
async function resolveSellerProfileId(userId: string) {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  return seller === "seller_not_found" ? null : seller.id;
}

/**
 * The seller dashboard's numbers, computed in the database rather than from
 * every order item the store has ever had.
 */
export async function getSellerStats(userId: string) {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found" as const;
  const [items, listings] = await Promise.all([
    orderItemRepository.sellerStats(seller.id),
    productRepository.countBySellerAndStatus(seller.id),
  ]);
  return {
    ...items,
    // Paid items still to take to the hub.
    toDropOff:
      (items.countsByStatus.confirmed ?? 0) +
      (items.countsByStatus.processing ?? 0),
    totalSales: seller.totalSales,
    listings: {
      active: listings.active ?? 0,
      draft: listings.draft ?? 0,
      total: Object.values(listings).reduce((a, b) => a + (b ?? 0), 0),
    },
  };
}

export async function getSellerOrderItems(userId: string, page?: PageParams) {
  const sellerId = await resolveSellerProfileId(userId);
  if (!sellerId) return { items: [], nextCursor: null };
  return await orderItemRepository.pageItemsBySellerId(
    sellerId,
    undefined,
    page,
  );
}

export async function getSellerOrderItemsByStatus(
  userId: string,
  status: OrderStatus,
  page?: PageParams,
) {
  const sellerId = await resolveSellerProfileId(userId);
  if (!sellerId) return { items: [], nextCursor: null };
  return await orderItemRepository.pageItemsBySellerId(sellerId, status, page);
}

/** Steps a seller may take, by current item status. */
const SELLER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["cancelled"],
  confirmed: ["processing", "dropped_off", "cancelled"],
  processing: ["dropped_off", "cancelled"],
};

export type SellerItemStatus = "processing" | "dropped_off" | "cancelled";

/**
 * A seller moves their own item: packing → dropped off at the hub, or
 * cancelled. Receiving at the hub, shipping and delivery belong to Soko.
 * The buyer only hears about cancellations — progress is shown on the
 * order, not item by item.
 */
export async function updateOrderItemStatus(
  userId: string,
  orderItemId: string,
  status: SellerItemStatus,
): Promise<"order_item_not_found" | "invalid_transition" | "status_updated"> {
  const sellerId = await resolveSellerProfileId(userId);
  if (!sellerId) return "order_item_not_found";

  const item = await orderItemRepository.findOrderItemById(orderItemId);
  if (item === "order_item_not_found" || item.sellerId !== sellerId)
    return "order_item_not_found";
  if (!SELLER_TRANSITIONS[item.status as OrderStatus]?.includes(status))
    return "invalid_transition";

  await orderItemRepository.updateOrderItemStatus(
    orderItemId,
    sellerId,
    status,
  );

  if (status === "cancelled") {
    await productVariantRepository.adjustStock(
      item.productVariantId,
      item.quantity,
    );
  }

  const synced = await syncOrderStatus(item.orderId);
  if (synced && status === "cancelled") {
    const { order, next } = synced;
    if (next === "cancelled") {
      await notifyBuyer(
        order.buyerId,
        "order_cancelled",
        "Order cancelled",
        `Your order ${orderRef(order.id)} has been cancelled because its items are no longer available.`,
      );
    } else {
      await notifyBuyer(
        order.buyerId,
        "order_item_cancelled",
        "An item was cancelled",
        `One item in your order ${orderRef(order.id)} is no longer available and was removed. The rest of your order is on track.`,
      );
    }
  }

  return "status_updated";
}

// ─────────────────────────────────────────
// Hub (admin)
// ─────────────────────────────────────────

/**
 * Paid orders still being consolidated or on their way: what the hub has to
 * receive, pack or track. Newest first, with items and any shipment.
 */
export async function getHubOrders() {
  const orders = (
    await Promise.all(
      (["confirmed", "processing", "shipped"] as const).map((s) =>
        orderRepository.findOrdersByStatus(s),
      ),
    )
  )
    .flat()
    .filter((o) => o.paymentStatus === "paid")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Store names are for Soko staff at the hub (buyers never see them).
  const storeNames = new Map<string, string>();
  const storeName = async (sellerId: string) => {
    if (!storeNames.has(sellerId)) {
      const p = await sellerProfileRepository.findSellerProfileById(sellerId);
      storeNames.set(
        sellerId,
        p === "seller_not_found" ? "Unknown store" : p.storeName,
      );
    }
    return storeNames.get(sellerId)!;
  };

  return await Promise.all(
    orders.map(async (order) => {
      const [rawItems, shipment] = await Promise.all([
        orderItemRepository.findItemsByOrderId(order.id),
        shipmentRepository.findShipmentByOrderId(order.id),
      ]);
      const [items, address, buyer] = await Promise.all([
        Promise.all(
          rawItems.map(async (i: OrderItem) => ({
            ...i,
            storeName: await storeName(i.sellerId),
          })),
        ),
        userAddressRepository.findAddressById(
          order.deliveryAddressId,
          order.buyerId,
        ),
        userRepository.findUserById(order.buyerId),
      ]);
      return {
        order,
        items,
        // Where the courier takes it, and who to call.
        deliverTo: {
          name: buyer?.name ?? null,
          phone: buyer?.phone ?? null,
          address:
            address === "address_not_found"
              ? null
              : {
                  label: address.label,
                  street: address.street,
                  town: address.town,
                  county: address.county,
                },
        },
        shipment: shipment === "shipment_not_found" ? null : shipment,
        readyToShip:
          shipment === "shipment_not_found" &&
          items.some(isActive) &&
          items.filter(isActive).every((i: OrderItem) => i.status === "at_hub"),
      };
    }),
  );
}

/** The hub records that an item has arrived. */
export async function receiveItemAtHub(
  orderItemId: string,
): Promise<"order_item_not_found" | "invalid_transition" | "item_received"> {
  const item = await orderItemRepository.findOrderItemById(orderItemId);
  if (item === "order_item_not_found") return "order_item_not_found";
  // Sellers may hand items in without marking them first.
  if (!["confirmed", "processing", "dropped_off"].includes(item.status))
    return "invalid_transition";

  await orderItemRepository.setOrderItemStatus(orderItemId, "at_hub");
  await syncOrderStatus(item.orderId);
  return "item_received";
}

// ─────────────────────────────────────────
// Admin
// ─────────────────────────────────────────

export async function getOrdersByStatus(
  status: OrderStatus,
  page?: PageParams,
) {
  return await orderRepository.pageOrdersByStatus(status, page);
}

export async function getOrdersByPaymentStatus(
  paymentStatus: "pending" | "paid" | "failed" | "refunded",
  page?: PageParams,
) {
  return await orderRepository.pageOrdersByPaymentStatus(paymentStatus, page);
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<"order_not_found" | "status_updated"> {
  const result = await orderRepository.updateOrderStatus(orderId, status);
  if (result === "order_not_found") return "order_not_found";
  return "status_updated";
}
