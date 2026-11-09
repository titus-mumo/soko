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

/** Who an admin can pick as a recipient — never more than the picker shows. */
export type UserPick = Pick<
  User,
  "id" | "name" | "email" | "phone" | "role" | "profilePhoto"
>;

/** Up to 8 accounts whose name, email or phone matches `query`. */
export async function searchUsers(query: string): Promise<UserPick[]> {
  const { data } = await api.get<ApiResponse<UserPick[]>>(
    "/users/admin/search",
    { params: { q: query } },
  );
  return data.data;
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

export async function setPromotionActive(
  id: string,
  active: boolean,
): Promise<void> {
  await api.patch(
    `/promotions/admin/${id}/${active ? "activate" : "deactivate"}`,
  );
}

export async function deletePromotion(id: string): Promise<void> {
  await api.delete(`/promotions/admin/${id}`);
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

// ─── Audit log ────────────────────────────────────────────────────────────────

/** One API request, as recorded in the audit log. */
export interface AuditEntry {
  id: string;
  createdAt: string;
  method: string;
  path: string;
  /** Query string, secrets redacted. */
  query: string | null;
  status: number;
  durationMs: number;
  userId: string | null;
  role: string | null;
  userName: string | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
}

export interface AuditFilter {
  userId?: string;
  method?: string;
  /** "2xx", "4xx", "5xx" or an exact code. */
  status?: string;
  /** Substring of the path. */
  path?: string;
  /** Substring of the user's email or name. */
  user?: string;
  /** Exact client IP. */
  ip?: string;
}

/** One page of the audit log, newest first. */
export function getAuditLog(
  filter: AuditFilter,
  page?: PageRequest,
): Promise<Paged<AuditEntry>> {
  return getPage<AuditEntry>("/audit/admin", page, { ...filter });
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

export interface HourlyTraffic {
  hour: string;
  total: number;
  ok: number;
  refused: number;
  denied: number;
  rateLimited: number;
  serverErrors: number;
  failedSignIns: number;
  p50Ms: number;
  p95Ms: number;
  clients: number;
}

export interface MonitoringAlert {
  key: string;
  level: "critical" | "warning";
  title: string;
  detail: string;
}

export interface Monitoring {
  hours: number;
  from: string;
  totals: {
    requests: number;
    previousRequests: number;
    ok: number;
    refused: number;
    denied: number;
    rateLimited: number;
    serverErrors: number;
    failedSignIns: number;
    serverErrorRate: number;
    p95Ms: number;
    peakHourRequests: number;
  };
  hourly: HourlyTraffic[];
  routes: {
    method: string;
    route: string;
    requests: number;
    refused: number;
    serverErrors: number;
    p95Ms: number;
  }[];
  clients: {
    ip: string;
    requests: number;
    refused: number;
    denied: number;
    notFound: number;
    rateLimited: number;
    failedSignIns: number;
    users: number;
  }[];
  signIns: Monitoring["clients"];
  alerts: MonitoringAlert[];
}

/** Traffic for the last `hours` hours (24, 72 or 168). */
export async function getMonitoring(hours: number): Promise<Monitoring> {
  const { data } = await api.get<ApiResponse<Monitoring>>(
    "/audit/admin/stats",
    { params: { hours } },
  );
  return data.data;
}
