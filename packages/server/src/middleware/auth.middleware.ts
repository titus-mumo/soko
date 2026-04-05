import Elysia from "elysia";
import { verifyAccessToken } from "../lib/jwt";

// ─────────────────────────────────────────
// Auth Middleware Plugin
// ─────────────────────────────────────────

export const authMiddleware = new Elysia({ name: "auth-middleware" }).derive(
  async ({ request, set }) => {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("Access token is required.");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      set.status = 401;
      throw new Error("Access token is malformed.");
    }

    const payload = await verifyAccessToken(token);

    if (!payload) {
      set.status = 401;
      throw new Error("Invalid or expired access token.");
    }

    return {
      userId: payload.userId,
      role: payload.role as "buyer" | "seller" | "admin",
    };
  },
);

// ─────────────────────────────────────────
// Role Guard Plugins
// ─────────────────────────────────────────

export function requireRole(...roles: Array<"buyer" | "seller" | "admin">) {
  return new Elysia({ name: `require-role-${roles.join("-")}` })
    .use(authMiddleware)
    .onBeforeHandle((ctx: any) => {
      if (!roles.includes(ctx.role)) {
        ctx.set.status = 403;
        throw new Error("You do not have permission to access this resource.");
      }
    });
}

// ─────────────────────────────────────────
// Shorthand Role Guards
// ─────────────────────────────────────────

// Admin only — full platform access.
export const requireAdmin = requireRole("admin");

// Sellers and admins — store and product management.
export const requireSeller = requireRole("seller", "admin");

// Buyers and admins — shopping and order management.
export const requireBuyer = requireRole("buyer", "admin");
