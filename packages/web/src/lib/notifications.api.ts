import { api } from "./api";
import type { Notification } from "./types";

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await api.get("/notifications/me");
  return data.data;
}

export async function getUnreadNotifications(): Promise<Notification[]> {
  const { data } = await api.get("/notifications/me/unread");
  return data.data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get("/notifications/me/unread/count");
  return data.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/me/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/me/read-all");
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/me/${id}`);
}

export async function clearAllNotifications(): Promise<void> {
  await api.delete("/notifications/me");
}
