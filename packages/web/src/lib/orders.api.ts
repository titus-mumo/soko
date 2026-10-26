import { api } from "./api";
import { getPage, type Paged, type PageRequest } from "./paging";
import type {
  ApiResponse,
  Order,
  OrderDetail,
  OrderItem,
  SellerOrderItem,
  OrderStatus,
  PlacedOrder,
  SellerItemStatus,
  Shipment,
} from "./types";

export interface PlaceOrderPayload {
  deliveryAddressId: string;
  promotionCode?: string;
  notes?: string;
}

// ─── Buyer ───────────────────────────────────────────────────────────────────

/** One page of the buyer's orders, newest first, optionally at one status. */
export function getBuyerOrders(
  page?: PageRequest,
  status?: OrderStatus,
): Promise<Paged<Order>> {
  return getPage<Order>("/orders/me", page, { status });
}

/** Order counts for the buyer's dashboard. */
export async function getBuyerOrderStats(): Promise<{
  total: number;
  active: number;
}> {
  const { data } =
    await api.get<ApiResponse<{ total: number; active: number }>>(
      "/orders/me/stats",
    );
  return data.data;
}

export async function getBuyerOrderById(id: string): Promise<OrderDetail> {
  const { data } = await api.get<ApiResponse<OrderDetail>>(`/orders/me/${id}`);
  return data.data;
}

export async function placeOrder(
  payload: PlaceOrderPayload,
): Promise<PlacedOrder> {
  const { data } = await api.post<ApiResponse<PlacedOrder>>(
    "/orders/me",
    payload,
  );
  return data.data;
}

export async function cancelOrder(id: string): Promise<void> {
  await api.patch(`/orders/me/${id}/cancel`);
}

// ─── Seller ──────────────────────────────────────────────────────────────────

/** One page of the seller's order items, newest first. */
export function getSellerOrderItems(
  page?: PageRequest,
): Promise<Paged<SellerOrderItem>> {
  return getPage<SellerOrderItem>("/orders/seller/items", page);
}

/** One page of the seller's items at one status. */
export function getSellerOrderItemsByStatus(
  status: OrderStatus,
  page?: PageRequest,
): Promise<Paged<SellerOrderItem>> {
  return getPage<SellerOrderItem>(`/orders/seller/items/${status}`, page);
}

export interface SellerStats {
  countsByStatus: Partial<Record<OrderStatus, number>>;
  /** Delivered revenue, decimal string. */
  revenue: string;
  ordersToday: number;
  ordersYesterday: number;
  /** Sales per day, oldest first (14 days). */
  daily: number[];
  toDropOff: number;
  totalSales: number;
  listings: { active: number; draft: number; total: number };
}

/** The seller dashboard's numbers, computed by the API. */
export async function getSellerStats(): Promise<SellerStats> {
  const { data } = await api.get<ApiResponse<SellerStats>>(
    "/orders/seller/stats",
  );
  return data.data;
}

/** Seller: packing, dropped off at the hub, or cancelled. */
export async function updateOrderItemStatus(
  orderItemId: string,
  status: SellerItemStatus,
): Promise<void> {
  await api.patch(`/orders/seller/items/${orderItemId}/status`, { status });
}

// ─── Hub (admin) ─────────────────────────────────────────────────────────────

export interface HubOrder {
  order: Order;
  /** Items carry their store name — for hub staff only. */
  items: (OrderItem & { storeName: string })[];
  shipment: Shipment | null;
  /** Every remaining item is at the hub and nothing has shipped yet. */
  readyToShip: boolean;
  /** Where the courier takes it, and who to call. Hub staff only. */
  deliverTo: {
    name: string | null;
    phone: string | null;
    address: {
      label: string;
      street?: string | null;
      town: string;
      county: string;
    } | null;
  };
}

/** Paid orders being consolidated at the hub or on their way. */
export async function getHubOrders(): Promise<HubOrder[]> {
  const { data } = await api.get<ApiResponse<HubOrder[]>>("/orders/admin/hub");
  return data.data;
}

/** The hub records that an item was handed in. */
export async function receiveItemAtHub(orderItemId: string): Promise<void> {
  await api.patch(`/orders/admin/items/${orderItemId}/received`);
}
