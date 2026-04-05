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
} from "../controllers/auth.controller";
import { logoutAll } from "../services/auth.service";
import { verifyAccessToken } from "../lib/jwt";

export const authRoutes = new Elysia({ prefix: "/auth" })

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

  .post("/otp/request", requestOtpController, {
    body: t.Object({
      phone: t.String({ minLength: 10 }),
    }),
  })

  .post("/otp/verify", verifyOtpController, {
    body: t.Object({
      phone: t.String({ minLength: 10 }),
      code: t.String({ minLength: 6, maxLength: 6 }),
      name: t.Optional(t.String({ minLength: 2 })),
    }),
  })

  .get("/google", googleRedirectController)

  .get("/google/callback", googleCallbackController, {
    query: t.Object({
      code: t.Optional(t.String()),
      error: t.Optional(t.String()),
    }),
  })

  .post("/refresh", refreshTokenController)

  // Protected routes scoped inside a group with authMiddleware applied.
  .group("/protected", (app) =>
    app
      .use(authMiddleware)
      .post("/logout", logoutController)
      .post("/logout-all", async (ctx) => {
        const authHeader = ctx.request.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          ctx.set.status = 401;
          return { success: false, message: "Access token is required." };
        }

        const token = authHeader.split(" ")[1];
        const payload = await verifyAccessToken(token);

        if (!payload) {
          ctx.set.status = 401;
          return {
            success: false,
            message: "Invalid or expired access token.",
          };
        }

        console.log("userId from token:", payload.userId);

        await logoutAll(payload.userId);

        ctx.cookie["refresh_token"].set({
          value: "",
          httpOnly: true,
          secure: Bun.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 0,
          path: "/auth/refresh",
        });

        return { success: true, message: "Logged out from all devices." };
      }),
  );
