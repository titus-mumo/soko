import Elysia, { t } from "elysia";
import { pageParams, paged } from "../../lib/paging";
import { adminPlugin } from "../../middleware/auth.middleware";
import { userPick } from "../../lib/views";
import {
  getAllUsers,
  searchUsers,
  getUserById,
  updateUserRole,
  verifyUser,
  deleteUser,
} from "../../services/user.service";

export const GetAllUsers = new Elysia()
  .use(adminPlugin)
  .get("/admin", async (ctx) => {
    const { query } = ctx as any;
    return paged(await getAllUsers(pageParams(query)));
  });

export const SearchUsers = new Elysia()
  .use(adminPlugin)
  .get("/admin/search", async (ctx) => {
    const { query } = ctx as any;
    const users = await searchUsers(String(query.q ?? ""));
    return { success: true, data: users.map(userPick) };
  });

export const GetUserByIdAdmin = new Elysia()
  .use(adminPlugin)
  .get("/admin/:userId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await getUserById(params.userId);

    if (result === "user_not_found") {
      set.status = 404;
      return { success: false, message: "User not found." };
    }

    return { success: true, data: result };
  });

export const UpdateUserRole = new Elysia().use(adminPlugin).patch(
  "/admin/:userId/role",
  async (ctx) => {
    const { params, body, set } = ctx as any;
    const result = await updateUserRole(params.userId, body.role);

    if (result === "user_not_found") {
      set.status = 404;
      return { success: false, message: "User not found." };
    }

    return { success: true, message: "User role updated successfully." };
  },
  {
    body: t.Object({
      // No "seller": stores can't be created any more.
      role: t.Union([t.Literal("buyer"), t.Literal("admin")]),
    }),
  },
);

export const VerifyUser = new Elysia()
  .use(adminPlugin)
  .patch("/admin/:userId/verify", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await verifyUser(params.userId);

    if (result === "user_not_found") {
      set.status = 404;
      return { success: false, message: "User not found." };
    }

    return { success: true, message: "User verified successfully." };
  });

export const DeleteUser = new Elysia()
  .use(adminPlugin)
  .delete("/admin/:userId", async (ctx) => {
    const { params, set } = ctx as any;
    const result = await deleteUser(params.userId);

    if (result === "user_not_found") {
      set.status = 404;
      return { success: false, message: "User not found." };
    }

    return { success: true, message: "User deleted successfully." };
  });
