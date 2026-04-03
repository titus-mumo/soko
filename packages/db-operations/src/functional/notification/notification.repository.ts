import { db } from "src/db";
import { notificationsTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

export type NotificationChannel = "push" | "sms" | "email";

export type FindNotificationResponse = Notification | "notification_not_found";

export class NotificationRepository {
  async insertNotification(
    notification: NewNotification,
  ): Promise<Notification | null> {
    const [res] = await db
      .insert(notificationsTable)
      .values(notification)
      .returning();

    return res ?? null;
  }

  // Bulk insert for broadcasting a notification to multiple users at once.
  // Use this for platform-wide announcements or batch order status updates.
  async insertNotifications(
    notifications: NewNotification[],
  ): Promise<Notification[]> {
    if (notifications.length === 0) return [];

    return await db
      .insert(notificationsTable)
      .values(notifications)
      .returning();
  }

  async findNotificationById(id: string): Promise<FindNotificationResponse> {
    const [res] = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, id),
          isNull(notificationsTable.deletedAt),
        ),
      );

    if (!res) return "notification_not_found";

    return res;
  }

  // Returns all notifications for a user, most recent first via default insert order.
  // Use this for the notification centre / inbox view.
  async findNotificationsByUserId(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.deletedAt),
        ),
      );
  }

  // Returns only unread notifications for a user.
  // Use this for the unread badge count and notification bell dropdown.
  async findUnreadNotificationsByUserId(
    userId: string,
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
          isNull(notificationsTable.deletedAt),
        ),
      );
  }

  // Returns notifications filtered by channel.
  // Use this to query delivery history for a specific channel e.g. SMS logs.
  async findNotificationsByChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.channel, channel),
          isNull(notificationsTable.deletedAt),
        ),
      );
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<FindNotificationResponse> {
    const [res] = await db
      .update(notificationsTable)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "notification_not_found";

    return res;
  }

  // Marks all unread notifications as read for a user in one query.
  // Use this for a "mark all as read" action in the notification centre.
  async markAllAsRead(userId: string): Promise<boolean> {
    const res = await db
      .update(notificationsTable)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
          isNull(notificationsTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  async softDeleteNotification(id: string, userId: string): Promise<boolean> {
    const [res] = await db
      .update(notificationsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Clears all notifications for a user in one query.
  // Use this for a "clear all" action in the notification centre.
  async softDeleteAllNotificationsByUserId(userId: string): Promise<boolean> {
    const res = await db
      .update(notificationsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }
}
