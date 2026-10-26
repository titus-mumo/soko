import { api } from "./api";
import { getPage, type Paged, type PageRequest } from "./paging";
import type {
  ApiResponse,
  Category,
  DeliveryZone,
  NotificationChannel,
  Order,
  OrderStatus,
  PaymentStatus,
  User,
  UserRole,
} from "./types";
import type { Dispute, DisputeStatus } from "./disputes.api";

export type { Dispute, DisputeStatus };

// ─── Users ────────────────────────────────────────────────────────────────────

export function getAllUsers(page?: PageRequest): Promise<Paged<User>> {
  return getPage<User>("/users/admin", page);
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
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

export function getOrdersByStatus(
  status: OrderStatus,
  page?: PageRequest,
): Promise<Paged<Order>> {
  return getPage<Order>(`/orders/admin/status/${status}`, page);
}

export async function getOrdersByPaymentStatus(
  paymentStatus: PaymentStatus,
): Promise<Order[]> {
  const { data } = await api.get<ApiResponse<Order[]>>(
    `/orders/admin/payment-status/${paymentStatus}`,
  );
  return data.data;
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await api.patch(`/orders/admin/${orderId}/status`, { status });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  const { data } = await api.get<ApiResponse<Category[]>>("/categories/all");
  return data.data;
}

export async function createCategory(payload: {
  name: string;
  slug: string;
  parentId?: string;
}): Promise<Category> {
  const { data } = await api.post<ApiResponse<Category>>(
    "/categories",
    payload,
  );
  return data.data;
}

export async function updateCategory(
  categoryId: string,
  payload: { name?: string; slug?: string; parentId?: string },
): Promise<Category> {
  const { data } = await api.patch<ApiResponse<Category>>(
    `/categories/${categoryId}`,
    payload,
  );
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

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const { data } =
    await api.get<ApiResponse<DeliveryZone[]>>("/delivery/zones");
  return data.data;
}

export async function createDeliveryZone(payload: {
  name: string;
  county: string;
  estimatedDays: number;
  baseFee: string;
}): Promise<DeliveryZone> {
  const { data } = await api.post<ApiResponse<DeliveryZone>>(
    "/delivery/admin/zones",
    payload,
  );
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

export function getDisputesByStatus(
  status: DisputeStatus,
  page?: PageRequest,
): Promise<Paged<Dispute>> {
  return getPage<Dispute>(`/disputes/admin/status/${status}`, page);
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
  minOrderAmount?: string | null;
  maxUses?: number | null;
  usedCount?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  createdAt: string;
}

export interface CreatePromotionPayload {
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrderAmount?: string;
  maxUses?: number;
  expiresAt?: string;
}

export function getPlatformPromotions(
  page?: PageRequest,
): Promise<Paged<Promotion>> {
  return getPage<Promotion>("/promotions/admin", page);
}

export async function createPlatformPromotion(
  payload: CreatePromotionPayload,
): Promise<Promotion> {
  const { data } = await api.post<ApiResponse<Promotion>>(
    "/promotions/admin",
    payload,
  );
  return data.data;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function sendNotification(payload: {
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: NotificationChannel;
}): Promise<void> {
  await api.post("/notifications/admin/send", payload);
}

export async function broadcastNotification(payload: {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
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
