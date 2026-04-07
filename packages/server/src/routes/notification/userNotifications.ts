import Elysia from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import {
  getUserNotifications,
  getUnreadNotifications,
  getUnreadCount,
  getNotificationsByChannel,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../../services/notification.service";

export const GetUserNotifications = new Elysia()
  .use(authPlugin)
  .get("/me", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getUserNotifications(userId);
    return { success: true, data: result };
  });

export const GetUnreadNotifications = new Elysia()
  .use(authPlugin)
  .get("/me/unread", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getUnreadNotifications(userId);
    return { success: true, data: result };
  });

export const GetUnreadCount = new Elysia()
  .use(authPlugin)
  .get("/me/unread/count", async (ctx) => {
    const { userId } = ctx as any;
    const result = await getUnreadCount(userId);
    return { success: true, data: { count: result } };
  });

export const GetNotificationsByChannel = new Elysia()
  .use(authPlugin)
  .get("/me/channel/:channel", async (ctx) => {
    const { userId, params } = ctx as any;
    const result = await getNotificationsByChannel(userId, params.channel);
    return { success: true, data: result };
  });

export const MarkNotificationAsRead = new Elysia()
  .use(authPlugin)
  .patch("/me/:notificationId/read", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await markNotificationAsRead(userId, params.notificationId);

    if (result === "notification_not_found") {
      set.status = 404;
      return { success: false, message: "Notification not found." };
    }

    return { success: true, message: "Notification marked as read." };
  });

export const MarkAllNotificationsAsRead = new Elysia()
  .use(authPlugin)
  .patch("/me/read-all", async (ctx) => {
    const { userId } = ctx as any;
    await markAllNotificationsAsRead(userId);
    return { success: true, message: "All notifications marked as read." };
  });

export const DeleteNotification = new Elysia()
  .use(authPlugin)
  .delete("/me/:notificationId", async (ctx) => {
    const { userId, params, set } = ctx as any;
    const result = await deleteNotification(userId, params.notificationId);

    if (result === "notification_not_found") {
      set.status = 404;
      return { success: false, message: "Notification not found." };
    }

    return { success: true, message: "Notification deleted." };
  });

export const ClearAllNotifications = new Elysia()
  .use(authPlugin)
  .delete("/me", async (ctx) => {
    const { userId } = ctx as any;
    await clearAllNotifications(userId);
    return { success: true, message: "All notifications cleared." };
  });
