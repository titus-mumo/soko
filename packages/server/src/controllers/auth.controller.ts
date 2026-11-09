import type { Context } from "elysia";
import {
  registerWithEmail,
  loginWithEmail,
  requestOtp,
  verifyOtp,
  getGoogleRedirectUrl,
  handleGoogleCallback,
  refreshTokens,
  logout,
  logoutAll,
} from "../services/auth.service";
import { selfUser } from "../lib/views";

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

// Extracts request metadata for token audit trail.
function getMeta(ctx: Context) {
  return {
    userAgent: ctx.request.headers.get("user-agent") ?? undefined,
    ip: ctx.request.headers.get("x-forwarded-for") ?? undefined,
  };
}

// The refresh token lives in an HTTP-only cookie, sent only to /auth/*
// (refresh and logout). Renamed from "refresh_token" when its path widened,
// so an old, narrower cookie can't shadow it.
export const REFRESH_COOKIE = "soko_refresh";

/**
 * SameSite for the refresh cookie (COOKIE_SAMESITE):
 *   lax (default) — web app and API on the same site, e.g. soko.co.ke and
 *                   api.soko.co.ke, or localhost:3000 and localhost:5000.
 *   strict        — same, slightly stricter.
 *   none          — web app and API on different sites (e.g. a vercel.app
 *                   domain and another host). Requires HTTPS; some browsers
 *                   (Safari) block such third-party cookies regardless.
 */
function cookieOptions() {
  const raw = (Bun.env.COOKIE_SAMESITE ?? "lax").toLowerCase();
  const sameSite = raw === "none" || raw === "strict" ? raw : "lax";
  return {
    httpOnly: true,
    // Browsers drop SameSite=None cookies that aren't Secure.
    secure: Bun.env.NODE_ENV === "production" || sameSite === "none",
    sameSite: sameSite as "lax" | "strict" | "none",
    // The path the browser uses for /auth/* — "/api/auth" when the web app
    // proxies the API under its own domain (see web next.config.ts).
    path: Bun.env.COOKIE_PATH || "/auth",
    ...(Bun.env.COOKIE_DOMAIN && { domain: Bun.env.COOKIE_DOMAIN }),
  };
}

/**
 * Revokes the session this browser was already signed in to, if any — run on
 * every new sign-in so a previous account's session (say, an admin who didn't
 * sign out) can't linger and resurface on the next refresh.
 */
async function endPreviousSession(ctx: Context) {
  const previous = ctx.cookie[REFRESH_COOKIE]?.value;
  if (typeof previous === "string" && previous)
    await logout(previous).catch(() => {});
}

function setRefreshTokenCookie(ctx: Context, token: string) {
  ctx.cookie[REFRESH_COOKIE].set({
    ...cookieOptions(),
    value: token,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

export function clearRefreshTokenCookie(ctx: Context) {
  ctx.cookie[REFRESH_COOKIE].set({ ...cookieOptions(), value: "", maxAge: 0 });
}

// ─────────────────────────────────────────
// Email + Password
// ─────────────────────────────────────────

export async function registerWithEmailController(ctx: Context) {
  const body = ctx.body as {
    name: string;
    email: string;
    phone: string;
    password: string;
  };

  const result = await registerWithEmail(body, getMeta(ctx));

  if (result === "email_already_exists") {
    ctx.set.status = 409;
    return { success: false, message: "Email is already registered." };
  }

  if (result === "phone_already_exists") {
    ctx.set.status = 409;
    return { success: false, message: "Phone number is already registered." };
  }

  await endPreviousSession(ctx);
  setRefreshTokenCookie(ctx, result.tokens.refreshToken);

  ctx.set.status = 201;
  return {
    success: true,
    data: {
      user: selfUser(result.user),
      accessToken: result.tokens.accessToken,
    },
  };
}

export async function loginWithEmailController(ctx: Context) {
  const body = ctx.body as {
    email: string;
    password: string;
  };

  const result = await loginWithEmail(body, getMeta(ctx));

  if (result === "user_not_found") {
    ctx.set.status = 404;
    return { success: false, message: "No account found with that email." };
  }

  if (result === "incorrect_password") {
    ctx.set.status = 401;
    return { success: false, message: "Incorrect password." };
  }

  await endPreviousSession(ctx);
  setRefreshTokenCookie(ctx, result.tokens.refreshToken);

  return {
    success: true,
    data: {
      user: selfUser(result.user),
      accessToken: result.tokens.accessToken,
    },
  };
}

// ─────────────────────────────────────────
// Phone OTP
// ─────────────────────────────────────────

const NO_ACCOUNT_FOR_PHONE =
  "No account uses this phone number. Sign up first, then sign in with your phone.";

export async function requestOtpController(ctx: Context) {
  const body = ctx.body as { phone: string };

  const result = await requestOtp(body.phone);

  if (result === "user_not_found") {
    ctx.set.status = 404;
    return { success: false, message: NO_ACCOUNT_FOR_PHONE };
  }

  if (result === "failed_to_send") {
    ctx.set.status = 500;
    return { success: false, message: "Failed to send OTP. Please try again." };
  }

  return {
    success: true,
    message: "OTP sent successfully.",
  };
}

export async function verifyOtpController(ctx: Context) {
  const body = ctx.body as {
    phone: string;
    code: string;
  };

  const result = await verifyOtp(body, getMeta(ctx));

  if (result === "otp_not_found") {
    ctx.set.status = 404;
    return { success: false, message: "No OTP found for this phone number." };
  }

  if (result === "otp_used") {
    ctx.set.status = 400;
    return { success: false, message: "This OTP has already been used." };
  }

  if (result === "otp_expired") {
    ctx.set.status = 400;
    return {
      success: false,
      message: "This OTP has expired. Please request a new one.",
    };
  }

  if (result === "otp_incorrect") {
    ctx.set.status = 401;
    return { success: false, message: "Incorrect OTP." };
  }

  if (result === "user_not_found") {
    ctx.set.status = 404;
    return { success: false, message: NO_ACCOUNT_FOR_PHONE };
  }

  await endPreviousSession(ctx);
  setRefreshTokenCookie(ctx, result.tokens.refreshToken);

  return {
    success: true,
    data: {
      user: selfUser(result.user),
      accessToken: result.tokens.accessToken,
    },
  };
}

// ─────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────

export async function googleRedirectController(ctx: Context) {
  const url = await getGoogleRedirectUrl();

  // Redirect the user to Google's consent screen. (`set.redirect` is a no-op
  // in Elysia 1.4 and returned an empty 200.)
  return ctx.redirect(url, 302);
}

export async function googleCallbackController(ctx: Context) {
  const query = ctx.query as { code?: string; error?: string };

  // User denied access on Google's consent screen.
  if (query.error || !query.code) {
    ctx.set.status = 400;
    return { success: false, message: "Google authentication was cancelled." };
  }

  const result = await handleGoogleCallback(query.code, getMeta(ctx));

  if (result === "google_auth_failed") {
    ctx.set.status = 401;
    return {
      success: false,
      message: "Google authentication failed. Please try again.",
    };
  }

  await endPreviousSession(ctx);
  setRefreshTokenCookie(ctx, result.tokens.refreshToken);

  return {
    success: true,
    data: {
      user: selfUser(result.user),
      accessToken: result.tokens.accessToken,
    },
  };
}

// ─────────────────────────────────────────
// Token Refresh
// ─────────────────────────────────────────

export async function refreshTokenController(ctx: Context) {
  // Read refresh token from HTTP-only cookie, not the request body.
  const token = ctx.cookie[REFRESH_COOKIE].value;

  if (!token) {
    ctx.set.status = 401;
    return { success: false, message: "No refresh token provided." };
  }

  // token is guaranteed string here after the null check above,
  // but TypeScript still needs an explicit cast for jose/string params.
  const result = await refreshTokens(token as string, getMeta(ctx));

  if (result === "token_not_found") {
    ctx.set.status = 401;
    return { success: false, message: "Invalid refresh token." };
  }

  if (result === "token_revoked") {
    // Clear the cookie since the token family has been revoked.
    clearRefreshTokenCookie(ctx);
    ctx.set.status = 401;
    return {
      success: false,
      message: "Session has been revoked. Please log in again.",
    };
  }

  if (result === "token_expired") {
    clearRefreshTokenCookie(ctx);
    ctx.set.status = 401;
    return {
      success: false,
      message: "Session has expired. Please log in again.",
    };
  }

  // Rotate the refresh token cookie with the newly issued token.
  setRefreshTokenCookie(ctx, result.refreshToken);

  return {
    success: true,
    data: {
      accessToken: result.accessToken,
      // Whose session this is — the client checks it matches the account it
      // thinks is signed in (a stale cookie must never pass as someone else).
      user: selfUser(result.user),
    },
  };
}

// ─────────────────────────────────────────
// Logout
// ─────────────────────────────────────────

export async function logoutController(ctx: Context) {
  const token = ctx.cookie[REFRESH_COOKIE].value;

  if (token) {
    await logout(token as string);
  }

  clearRefreshTokenCookie(ctx);

  return { success: true, message: "Logged out successfully." };
}

// export async function logoutAllController(ctx: Context) {
//   // userId is injected by the auth middleware after access token verification.
//   const userId = (ctx as any).userId as string;

//   await logoutAll(userId);

//   clearRefreshTokenCookie(ctx);

//   return { success: true, message: "Logged out from all devices." };
// }
