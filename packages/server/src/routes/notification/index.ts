import Elysia from "elysia";
import {
  GetUserNotifications,
  GetUnreadNotifications,
  GetUnreadCount,
  GetNotificationsByChannel,
  MarkNotificationAsRead,
  MarkAllNotificationsAsRead,
  DeleteNotification,
  ClearAllNotifications,
} from "./userNotifications";
import { SendNotification, BroadcastNotification } from "./adminNotifications";

export const notificationRoutes = new Elysia().group("/notifications", (app) =>
  app
    // User
    .use(GetUserNotifications)
    .use(GetUnreadNotifications)
    .use(GetUnreadCount)
    .use(GetNotificationsByChannel)
    .use(MarkNotificationAsRead)
    .use(MarkAllNotificationsAsRead)
    .use(DeleteNotification)
    .use(ClearAllNotifications)
    // Admin
    .use(SendNotification)
    .use(BroadcastNotification)
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION") {
        set.status = 400;
        return { success: false, message: error.message };
      }
      if (code === "INTERNAL_SERVER_ERROR") {
        set.status = 500;
        return { success: false, message: "Internal server error." };
      }
    }),
);
