import Elysia, { t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  registerWithEmailController,
  loginWithEmailController,
  requestOtpController,
  verifyOtpController,
  googleRedirectController,
  googleCallbackController,
  refreshTokenController,
  logoutController,
  logoutAllController,
} from "../controllers/auth.controller";

export const authRoutes = new Elysia({ prefix: "/auth" })

  // ─────────────────────────────────────────
  // Email + Password
  // ─────────────────────────────────────────

  .post("/register", registerWithEmailController, {
    body: t.Object({
      name: t.String({ minLength: 2 }),
      email: t.String({ format: "email" }),
      phone: t.String({ minLength: 10 }),
      password: t.String({ minLength: 8 }),
    }),
  })

  .post("/login", loginWithEmailController, {
    body: t.Object({
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 1 }),
    }),
  })

  // ─────────────────────────────────────────
  // Phone OTP
  // ─────────────────────────────────────────

  .post("/otp/request", requestOtpController, {
    body: t.Object({
      phone: t.String({ minLength: 10 }),
    }),
  })

  .post("/otp/verify", verifyOtpController, {
    body: t.Object({
      phone: t.String({ minLength: 10 }),
      code: t.String({ minLength: 6, maxLength: 6 }),
      // name is optional — only required for new users registering via OTP.
      name: t.Optional(t.String({ minLength: 2 })),
    }),
  })

  // ─────────────────────────────────────────
  // Google OAuth
  // ─────────────────────────────────────────

  .get("/google", googleRedirectController)

  .get("/google/callback", googleCallbackController, {
    query: t.Object({
      code: t.Optional(t.String()),
      error: t.Optional(t.String()),
    }),
  })

  // ─────────────────────────────────────────
  // Token Refresh
  // ─────────────────────────────────────────

  .post("/refresh", refreshTokenController);

// Logout routes are separated into a protected group since
// logout-all requires a valid access token.
export const protectedAuthRoutes = new Elysia({ prefix: "/auth" })
  .use(authMiddleware)

  .post("/logout", logoutController)

  // Revokes all sessions across all devices.
  .post("/logout-all", logoutAllController);
