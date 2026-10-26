import { getRepositories } from "../lib/repositories";
import type { PageParams } from "db-operations";
import type { NewNotification } from "db-operations";

const { notificationRepository } = getRepositories();

// ─────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────

export async function getUserNotifications(userId: string, page?: PageParams) {
  return await notificationRepository.pageNotificationsByUserId(
    userId,
    false,
    page,
  );
}

export async function getUnreadNotifications(
  userId: string,
  page?: PageParams,
) {
  return await notificationRepository.pageNotificationsByUserId(
    userId,
    true,
    page,
  );
}

export async function getNotificationsByChannel(
  userId: string,
  channel: "push" | "sms" | "email",
) {
  return await notificationRepository.findNotificationsByChannel(
    userId,
    channel,
  );
}

// ─────────────────────────────────────────
// Send
// ─────────────────────────────────────────

// Single notification — use this for targeted user notifications.
export async function sendNotification(
  data: Pick<NewNotification, "userId" | "type" | "title" | "body" | "channel">,
): Promise<"notification_sent" | "failed_to_send"> {
  const result = await notificationRepository.insertNotification(data);
  if (!result) return "failed_to_send";
  return "notification_sent";
}

// Broadcasts the same notification to multiple users in one round trip.
// Use this for platform-wide announcements or batch alerts.
export async function broadcastNotification(
  userIds: string[],
  data: Pick<NewNotification, "type" | "title" | "body" | "channel">,
): Promise<"broadcast_sent" | "no_recipients"> {
  if (userIds.length === 0) return "no_recipients";

  await notificationRepository.insertNotifications(
    userIds.map((userId) => ({ userId, ...data })),
  );

  return "broadcast_sent";
}

// ─────────────────────────────────────────
// Read State
// ─────────────────────────────────────────

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<"notification_not_found" | "notification_read"> {
  const result = await notificationRepository.markAsRead(
    notificationId,
    userId,
  );

  if (result === "notification_not_found") return "notification_not_found";

  return "notification_read";
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<"all_read"> {
  await notificationRepository.markAllAsRead(userId);
  return "all_read";
}

// ─────────────────────────────────────────
// Delete
// ─────────────────────────────────────────

export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<"notification_not_found" | "notification_deleted"> {
  const result = await notificationRepository.softDeleteNotification(
    notificationId,
    userId,
  );

  if (!result) return "notification_not_found";

  return "notification_deleted";
}

export async function clearAllNotifications(
  userId: string,
): Promise<"notifications_cleared"> {
  await notificationRepository.softDeleteAllNotificationsByUserId(userId);
  return "notifications_cleared";
}

// ─────────────────────────────────────────
// Unread Count
// ─────────────────────────────────────────

// Returns the unread notification count for badge display.
// Use this on the notification bell icon in the app header.
export async function getUnreadCount(userId: string): Promise<number> {
  const unread =
    await notificationRepository.findUnreadNotificationsByUserId(userId);
  return unread.length;
}
