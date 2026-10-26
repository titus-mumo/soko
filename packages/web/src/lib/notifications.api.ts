import { api } from "./api";
import { getPage, type Paged, type PageRequest } from "./paging";
import type { ApiResponse, Notification } from "./types";

/** One page of notifications, newest first; `unreadOnly` for the Unread tab. */
export function getUserNotifications(
  page?: PageRequest,
  unreadOnly = false,
): Promise<Paged<Notification>> {
  return getPage<Notification>(
    unreadOnly ? "/notifications/me/unread" : "/notifications/me",
    page,
  );
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<ApiResponse<{ count: number } | number>>(
    "/notifications/me/unread/count",
  );
  // Tolerate either { count } or a bare number.
  return typeof data.data === "number" ? data.data : (data.data?.count ?? 0);
}

export async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/me/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await api.patch("/notifications/me/read-all");
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/me/${id}`);
}

export async function clearAll(): Promise<void> {
  await api.delete("/notifications/me");
}
