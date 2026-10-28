import Elysia, { t } from "elysia";
import { authPlugin } from "../../middleware/auth.middleware";
import {
  getUserById,
  updateProfile,
  changePassword,
} from "../../services/user.service";
import { selfUser } from "../../lib/views";

export const GetUserProfile = new Elysia()
  .use(authPlugin)
  .get("/me", async (ctx) => {
    const { userId, set } = ctx as any;
    const result = await getUserById(userId);

    if (result === "user_not_found") {
      set.status = 404;
      return { success: false, message: "User not found." };
    }

    return { success: true, data: selfUser(result) };
  });

export const UpdateUserProfile = new Elysia().use(authPlugin).patch(
  "/me",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    // Only these fields — extra ones (e.g. profilePhoto) are ignored.
    const { name, email, phone } = body;
    const result = await updateProfile(userId, { name, email, phone });

    if (result === "user_not_found") {
      set.status = 404;
      return { success: false, message: "User not found." };
    }
    if (result === "email_taken") {
      set.status = 409;
      return { success: false, message: "Email is already in use." };
    }
    if (result === "phone_taken") {
      set.status = 409;
      return { success: false, message: "Phone number is already in use." };
    }

    return { success: true, data: result && selfUser(result) };
  },
  {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2 })),
      email: t.Optional(t.String({ format: "email" })),
      phone: t.Optional(t.String({ minLength: 10 })),
      // No profilePhoto: it's set by uploading (POST /uploads/me/avatar).
    }),
  },
);

export const ChangePassword = new Elysia().use(authPlugin).patch(
  "/me/password",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    const result = await changePassword(userId, body);

    if (result === "user_not_found") {
      set.status = 404;
      return { success: false, message: "User not found." };
    }
    if (result === "incorrect_password") {
      set.status = 401;
      return { success: false, message: "Current password is incorrect." };
    }

    return { success: true, message: "Password changed successfully." };
  },
  {
    body: t.Object({
      currentPassword: t.String({ minLength: 1 }),
      newPassword: t.String({ minLength: 8 }),
    }),
  },
);
