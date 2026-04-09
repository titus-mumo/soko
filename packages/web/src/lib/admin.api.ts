import { api } from "./api";
import type { User, Order, Category } from "./types";

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  const { data } = await api.get("/users/admin");
  return data.data;
}

export async function updateUserRole(
  userId: string,
  role: "buyer" | "seller" | "admin",
): Promise<void> {
  await api.patch(`/users/admin/${userId}/role`, { role });
}

export async function verifyUser(userId: string): Promise<void> {
  await api.patch(`/users/admin/${userId}/verify`);
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/users/admin/${userId}`);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getOrdersByStatus(status: string): Promise<Order[]> {
  const { data } = await api.get(`/orders/admin/status/${status}`);
  return data.data;
}

export async function getOrdersByPaymentStatus(
  paymentStatus: string,
): Promise<Order[]> {
  const { data } = await api.get(
    `/orders/admin/payment-status/${paymentStatus}`,
  );
  return data.data;
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: string,
): Promise<void> {
  await api.patch(`/orders/admin/${orderId}/status`, { status });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  const { data } = await api.get("/categories/all");
  return data.data;
}

export async function createCategory(payload: {
  name: string;
  slug: string;
  parentId?: string;
}): Promise<Category> {
  const { data } = await api.post("/categories", payload);
  return data.data;
}

export async function updateCategory(
  categoryId: string,
  payload: { name?: string; slug?: string; parentId?: string },
): Promise<Category> {
  const { data } = await api.patch(`/categories/${categoryId}`, payload);
  return data.data;
}

export async function deactivateCategory(categoryId: string): Promise<void> {
  await api.patch(`/categories/${categoryId}/deactivate`);
}

export async function activateCategory(categoryId: string): Promise<void> {
  await api.patch(`/categories/${categoryId}/activate`);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await api.delete(`/categories/${categoryId}`);
}

// ─── Delivery zones ───────────────────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  name: string;
  county: string;
  baseFee: string;
  estimatedDays: number;
  isActive?: boolean;
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const { data } = await api.get("/delivery/zones");
  return data.data;
}

export async function createDeliveryZone(payload: {
  name: string;
  county: string;
  estimatedDays: number;
  baseFee: string;
}): Promise<DeliveryZone> {
  const { data } = await api.post("/delivery/admin/zones", payload);
  return data.data;
}

export async function updateDeliveryZone(
  zoneId: string,
  payload: {
    name?: string;
    county?: string;
    estimatedDays?: number;
    baseFee?: string;
  },
): Promise<void> {
  await api.patch(`/delivery/admin/zones/${zoneId}`, payload);
}

export async function updateDeliveryZoneFee(
  zoneId: string,
  baseFee: string,
): Promise<void> {
  await api.patch(`/delivery/admin/zones/${zoneId}/fee`, { baseFee });
}

export async function deleteDeliveryZone(zoneId: string): Promise<void> {
  await api.delete(`/delivery/admin/zones/${zoneId}`);
}

// ─── Disputes ────────────────────────────────────────────────────────────────

export type DisputeStatus = "open" | "under_review" | "resolved" | "closed";

export interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  reason: string;
  description?: string;
  status: DisputeStatus;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getDisputesByStatus(
  status: DisputeStatus,
): Promise<Dispute[]> {
  const { data } = await api.get(`/disputes/admin/status/${status}`);
  return data.data;
}

export async function reviewDispute(disputeId: string): Promise<void> {
  await api.patch(`/disputes/admin/${disputeId}/review`);
}

export async function resolveDispute(
  disputeId: string,
  resolution: string,
): Promise<void> {
  await api.patch(`/disputes/admin/${disputeId}/resolve`, { resolution });
}

export async function closeDispute(disputeId: string): Promise<void> {
  await api.patch(`/disputes/admin/${disputeId}/close`);
}

// ─── Promotions ───────────────────────────────────────────────────────────────

export interface Promotion {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrderAmount?: string;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: string;
  isActive?: boolean;
  createdAt: string;
}

export async function getPlatformPromotions(): Promise<Promotion[]> {
  const { data } = await api.get("/promotions/admin");
  return data.data;
}

export async function createPlatformPromotion(payload: {
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrderAmount?: string;
  maxUses?: number;
  expiresAt?: string;
}): Promise<Promotion> {
  const { data } = await api.post("/promotions/admin", payload);
  return data.data;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function sendNotification(payload: {
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: "push" | "sms" | "email";
}): Promise<void> {
  await api.post("/notifications/admin/send", payload);
}

export async function broadcastNotification(payload: {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  channel: "push" | "sms" | "email";
}): Promise<void> {
  await api.post("/notifications/admin/broadcast", payload);
}

// ─── Sellers ──────────────────────────────────────────────────────────────────

export async function verifySeller(userId: string): Promise<void> {
  await api.patch(`/sellers/admin/${userId}/verify`);
}

export async function deleteSellerProfile(userId: string): Promise<void> {
  await api.delete(`/sellers/admin/${userId}`);
}
