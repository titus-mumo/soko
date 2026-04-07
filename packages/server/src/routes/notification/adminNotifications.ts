import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  sendNotification,
  broadcastNotification,
} from "../../services/notification.service";

export const SendNotification = new Elysia().use(adminPlugin).post(
  "/admin/send",
  async (ctx) => {
    const { body, set } = ctx as any;
    const result = await sendNotification(body);

    if (result === "failed_to_send") {
      set.status = 500;
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
);

export const BroadcastNotification = new Elysia().use(adminPlugin).post(
  "/admin/broadcast",
  async (ctx) => {
    const { body, set } = ctx as any;
    const result = await broadcastNotification(body.userIds, {
      type: body.type,
      title: body.title,
      body: body.message,
      channel: body.channel,
    });

    if (result === "no_recipients") {
      set.status = 400;
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
);
