import { api } from "./api";
import type { Order, OrderStatus } from "./types";

export interface CreateOrderPayload {
  deliveryAddressId: string;
  promotionCode?: string;
  notes?: string;
}

export async function getOrders(): Promise<Order[]> {
  const { data } = await api.get("/orders/me");
  return data.data;
}

export async function getOrderById(id: string): Promise<Order> {
  const { data } = await api.get(`/orders/me/${id}`);
  return data.data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await api.post("/orders/me", payload);
  return data.data;
}

export async function cancelOrder(id: string): Promise<Order> {
  const { data } = await api.patch(`/orders/me/${id}/cancel`);
  return data.data;
}

// Seller endpoints
export async function getSellerOrders(): Promise<Order[]> {
  const { data } = await api.get("/orders/seller/items");
  return data.data;
}

export async function getSellerOrdersByStatus(
  status: OrderStatus,
): Promise<Order[]> {
  const { data } = await api.get(`/orders/seller/items/${status}`);
  return data.data;
}

export async function updateOrderItemStatus(
  orderItemId: string,
  status: OrderStatus,
): Promise<void> {
  await api.patch(`/orders/seller/items/${orderItemId}/status`, { status });
}
