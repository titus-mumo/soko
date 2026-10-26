import Elysia from "elysia";
import { verifyAccessToken } from "../lib/jwt";

const getPayload = async (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  return await verifyAccessToken(token);
};

// ─────────────────────────────────────────
// Auth Plugin — any logged in user
// ─────────────────────────────────────────

export const authPlugin = () =>
  new Elysia()
    .derive(async ({ request }) => {
      if (Bun.env.NODE_ENV !== "test") console.log("AUTH PLUGIN RUNNING 🔐");
      const payload = await getPayload(request);
      return {
        userId: payload?.userId ?? null,
        role: payload?.role ?? null,
      };
    })
    .onBeforeHandle(({ userId, set }: any) => {
      if (!userId) {
        set.status = 401;
        return { success: false, message: "Access token is required." };
      }
    });

// ─────────────────────────────────────────
// Role Guard Plugins
// ─────────────────────────────────────────

export const adminPlugin = () =>
  new Elysia()
    .derive(async ({ request }) => {
      const payload = await getPayload(request);
      return {
        userId: payload?.userId ?? null,
        role: payload?.role ?? null,
      };
    })
    .onBeforeHandle(({ userId, role, set }: any) => {
      if (!userId) {
        set.status = 401;
        return { success: false, message: "Access token is required." };
      }
      if (role !== "admin") {
        set.status = 403;
        return { success: false, message: "Admin access required." };
      }
    });

export const sellerPlugin = () =>
  new Elysia()
    .derive(async ({ request }) => {
      const payload = await getPayload(request);
      return {
        userId: payload?.userId ?? null,
        role: payload?.role ?? null,
      };
    })
    .onBeforeHandle(({ userId, role, set }: any) => {
      if (!userId) {
        set.status = 401;
        return { success: false, message: "Access token is required." };
      }
      if (!["seller", "admin"].includes(role)) {
        set.status = 403;
        return { success: false, message: "Seller access required." };
      }
    });

export const buyerPlugin = () =>
  new Elysia()
    .derive(async ({ request }) => {
      const payload = await getPayload(request);
      return {
        userId: payload?.userId ?? null,
        role: payload?.role ?? null,
      };
    })
    .onBeforeHandle(({ userId, role, set }: any) => {
      if (!userId) {
        set.status = 401;
        return { success: false, message: "Access token is required." };
      }
      if (!["buyer", "admin"].includes(role)) {
        set.status = 403;
        return { success: false, message: "Buyer access required." };
      }
    });
