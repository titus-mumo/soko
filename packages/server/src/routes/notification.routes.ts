import Elysia, { t } from "elysia";
import { authPlugin, adminPlugin } from "../middleware/auth.middleware";
import {
  getUserNotifications,
  getUnreadNotifications,
  getNotificationsByChannel,
  sendNotification,
  broadcastNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
} from "../services/notification.service";

export const notificationRoutes = new Elysia({ prefix: "/notifications" })

  // ─────────────────────────────────────────
  // Buyer / Seller — Notifications
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(authPlugin)

      // Get all notifications for the current user.
      .get("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getUserNotifications(userId);
        return { success: true, data: result };
      })

      // Get only unread notifications.
      // Use this for the notification bell dropdown.
      .get("/unread", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getUnreadNotifications(userId);
        return { success: true, data: result };
      })

      // Get the unread notification count.
      // Use this for the notification badge on the bell icon.
      .get("/unread/count", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getUnreadCount(userId);
        return { success: true, data: { count: result } };
      })

      // Get notifications filtered by channel.
      .get("/channel/:channel", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await getNotificationsByChannel(userId, params.channel);
        return { success: true, data: result };
      })

      // Mark a single notification as read.
      .patch("/:notificationId/read", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await markNotificationAsRead(
          userId,
          params.notificationId,
        );

        if (result === "notification_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Notification not found." };
        }

        return { success: true, message: "Notification marked as read." };
      })

      // Mark all notifications as read.
      // Use this for the "mark all as read" action.
      .patch("/read-all", async (ctx) => {
        const { userId } = ctx as any;
        await markAllNotificationsAsRead(userId);
        return { success: true, message: "All notifications marked as read." };
      })

      // Delete a single notification.
      .delete("/:notificationId", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await deleteNotification(userId, params.notificationId);

        if (result === "notification_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Notification not found." };
        }

        return { success: true, message: "Notification deleted." };
      })

      // Clear all notifications for the current user.
      // Use this for the "clear all" action in the notification centre.
      .delete("/", async (ctx) => {
        const { userId } = ctx as any;
        await clearAllNotifications(userId);
        return { success: true, message: "All notifications cleared." };
      }),
  )

  // ─────────────────────────────────────────
  // Admin
  // ─────────────────────────────────────────

  .group("/admin", (app) =>
    app
      .use(adminPlugin())

      // Send a targeted notification to a specific user.
      .post(
        "/send",
        async (ctx) => {
          const { body } = ctx as any;
          const result = await sendNotification(body);

          if (result === "failed_to_send") {
            ctx.set.status = 500;
            return { success: false, message: "Failed to send notification." };
          }

          return { success: true, message: "Notification sent." };
        },
        {
          body: t.Object({
            userId: t.String(),
            type: t.String(),
            title: t.String({ minLength: 1 }),
            body: t.String({ minLength: 1 }),
            channel: t.Union([
              t.Literal("push"),
              t.Literal("sms"),
              t.Literal("email"),
            ]),
          }),
        },
      )

      // Broadcast a notification to multiple users at once.
      // Use this for platform-wide announcements.
      .post(
        "/broadcast",
        async (ctx) => {
          const { body } = ctx as any;
          const result = await broadcastNotification(body.userIds, {
            type: body.type,
            title: body.title,
            body: body.message,
            channel: body.channel,
          });

          if (result === "no_recipients") {
            ctx.set.status = 400;
            return { success: false, message: "No recipients provided." };
          }

          return { success: true, message: "Notification broadcast sent." };
        },
        {
          body: t.Object({
            userIds: t.Array(t.String(), { minItems: 1 }),
            type: t.String(),
            title: t.String({ minLength: 1 }),
            message: t.String({ minLength: 1 }),
            channel: t.Union([
              t.Literal("push"),
              t.Literal("sms"),
              t.Literal("email"),
            ]),
          }),
        },
      ),
  );
