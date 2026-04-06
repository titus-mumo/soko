import Elysia, { t } from "elysia";
import { authPlugin, adminPlugin } from "../middleware/auth.middleware";
import {
  getUserById,
  updateProfile,
  changePassword,
  getUserAddresses,
  addAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress,
  getAllUsers,
  updateUserRole,
  verifyUser,
  deleteUser,
} from "../services/user.service";

export const userRoutes = new Elysia({ prefix: "/users" })

  // ─────────────────────────────────────────
  // Profile
  // ─────────────────────────────────────────

  .group("/me", (app) =>
    app
      .use(authPlugin)

      // Get current user's profile.
      .get("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getUserById(userId);

        if (result === "user_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "User not found." };
        }

        return { success: true, data: result };
      })

      // Update current user's profile.
      .patch(
        "/",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await updateProfile(userId, body);

          if (result === "user_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "User not found." };
          }

          if (result === "email_taken") {
            ctx.set.status = 409;
            return { success: false, message: "Email is already in use." };
          }

          if (result === "phone_taken") {
            ctx.set.status = 409;
            return {
              success: false,
              message: "Phone number is already in use.",
            };
          }

          return { success: true, data: result };
        },
        {
          body: t.Object({
            name: t.Optional(t.String({ minLength: 2 })),
            email: t.Optional(t.String({ format: "email" })),
            phone: t.Optional(t.String({ minLength: 10 })),
            profilePhoto: t.Optional(t.String()),
          }),
        },
      )

      // Change password.
      .patch(
        "/password",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await changePassword(userId, body);

          if (result === "user_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "User not found." };
          }

          if (result === "incorrect_password") {
            ctx.set.status = 401;
            return {
              success: false,
              message: "Current password is incorrect.",
            };
          }

          return { success: true, message: "Password changed successfully." };
        },
        {
          body: t.Object({
            currentPassword: t.String({ minLength: 1 }),
            newPassword: t.String({ minLength: 8 }),
          }),
        },
      ),
  )

  // ─────────────────────────────────────────
  // Addresses
  // ─────────────────────────────────────────

  .group("/me/addresses", (app) =>
    app
      .use(authPlugin)

      // Get all addresses for the current user.
      .get("/", async (ctx) => {
        const { userId } = ctx as any;
        const result = await getUserAddresses(userId);
        return { success: true, data: result };
      })

      // Add a new address.
      .post(
        "/",
        async (ctx) => {
          const { userId, body } = ctx as any;
          const result = await addAddress(userId, body);

          if (!result) {
            ctx.set.status = 500;
            return { success: false, message: "Failed to add address." };
          }

          ctx.set.status = 201;
          return { success: true, data: result };
        },
        {
          body: t.Object({
            label: t.String(),
            county: t.String(),
            town: t.String(),
            street: t.Optional(t.String()),
            latitude: t.Optional(t.String()),
            longitude: t.Optional(t.String()),
            isDefault: t.Optional(t.Boolean()),
          }),
        },
      )

      // Update an address.
      .patch(
        "/:addressId",
        async (ctx) => {
          const { userId, body, params } = ctx as any;
          const result = await updateAddress(userId, params.addressId, body);

          if (result === "address_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "Address not found." };
          }

          return { success: true, data: result };
        },
        {
          body: t.Object({
            label: t.Optional(t.String()),
            county: t.Optional(t.String()),
            town: t.Optional(t.String()),
            street: t.Optional(t.String()),
            latitude: t.Optional(t.String()),
            longitude: t.Optional(t.String()),
            isDefault: t.Optional(t.Boolean()),
          }),
        },
      )

      // Set an address as default.
      .patch("/:addressId/default", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await setDefaultAddress(userId, params.addressId);

        if (result === "address_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "Address not found." };
        }

        return { success: true, data: result };
      })

      // Remove an address.
      .delete("/:addressId", async (ctx) => {
        const { userId, params } = ctx as any;
        const result = await removeAddress(userId, params.addressId);

        if (!result) {
          ctx.set.status = 404;
          return { success: false, message: "Address not found." };
        }

        return { success: true, message: "Address removed successfully." };
      }),
  )

  // ─────────────────────────────────────────
  // Admin
  // ─────────────────────────────────────────

  .group("/admin", (app) =>
    app
      .use(adminPlugin())

      // Get all users.
      .get("/", async (ctx) => {
        const result = await getAllUsers();
        return { success: true, data: result };
      })

      // Get a user by ID.
      .get("/:userId", async (ctx) => {
        const { params } = ctx as any;
        const result = await getUserById(params.userId);

        if (result === "user_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "User not found." };
        }

        return { success: true, data: result };
      })

      // Update a user's role.
      .patch(
        "/:userId/role",
        async (ctx) => {
          const { params, body } = ctx as any;
          const result = await updateUserRole(params.userId, body.role);

          if (result === "user_not_found") {
            ctx.set.status = 404;
            return { success: false, message: "User not found." };
          }

          return { success: true, message: "User role updated successfully." };
        },
        {
          body: t.Object({
            role: t.Union([
              t.Literal("buyer"),
              t.Literal("seller"),
              t.Literal("admin"),
            ]),
          }),
        },
      )

      // Verify a user's account.
      .patch("/:userId/verify", async (ctx) => {
        const { params } = ctx as any;
        const result = await verifyUser(params.userId);

        if (result === "user_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "User not found." };
        }

        return { success: true, message: "User verified successfully." };
      })

      // Soft delete a user.
      .delete("/:userId", async (ctx) => {
        const { params } = ctx as any;
        const result = await deleteUser(params.userId);

        if (result === "user_not_found") {
          ctx.set.status = 404;
          return { success: false, message: "User not found." };
        }

        return { success: true, message: "User deleted successfully." };
      }),
  );
