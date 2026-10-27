import Elysia from "elysia";
import {
  clearRefreshTokenCookie,
  logoutController,
} from "../../controllers/auth.controller";
import { logoutAll } from "../../services/auth.service";
import { verifyAccessToken } from "../../lib/jwt";

export const Logout = new Elysia().post("/logout", logoutController);

export const LogoutAll = new Elysia().post("/logout-all", async (ctx) => {
  const authHeader = ctx.request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.set.status = 401;
    return { success: false, message: "Access token is required." };
  }

  const token = authHeader.split(" ")[1];
  const payload = await verifyAccessToken(token);

  if (!payload) {
    ctx.set.status = 401;
    return { success: false, message: "Invalid or expired access token." };
  }

  await logoutAll(payload.userId);

  clearRefreshTokenCookie(ctx as any);

  return { success: true, message: "Logged out from all devices." };
});
