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

// Sets the refresh token as an HTTP-only cookie.
function setRefreshTokenCookie(ctx: Context, token: string) {
  ctx.cookie["refresh_token"].set({
    value: token,
    httpOnly: true,
    secure: Bun.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/auth/refresh", // scoped to refresh endpoint only
  });
}

function clearRefreshTokenCookie(ctx: Context) {
  ctx.cookie["refresh_token"].set({
    value: "",
    httpOnly: true,
    secure: Bun.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/auth/refresh",
  });
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

  setRefreshTokenCookie(ctx, result.tokens.refreshToken);

  ctx.set.status = 201;
  return {
    success: true,
    data: {
      user: result.user,
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

  setRefreshTokenCookie(ctx, result.tokens.refreshToken);

  return {
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  };
}

// ─────────────────────────────────────────
// Phone OTP
// ─────────────────────────────────────────

export async function requestOtpController(ctx: Context) {
  const body = ctx.body as { phone: string };

  const result = await requestOtp(body.phone);

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
    name?: string;
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

  if (result === "name_required") {
    ctx.set.status = 400;
    return {
      success: false,
      message: "Please provide your name to complete registration.",
    };
  }

  setRefreshTokenCookie(ctx, result.tokens.refreshToken);

  return {
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  };
}

// ─────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────

export async function googleRedirectController(ctx: Context) {
  const url = await getGoogleRedirectUrl();

  // Redirect the user to Google's consent screen.
  ctx.set.redirect = url;
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

  setRefreshTokenCookie(ctx, result.tokens.refreshToken);

  return {
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  };
}

// ─────────────────────────────────────────
// Token Refresh
// ─────────────────────────────────────────

export async function refreshTokenController(ctx: Context) {
  // Read refresh token from HTTP-only cookie, not the request body.
  const token = ctx.cookie["refresh_token"].value;

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
    },
  };
}

// ─────────────────────────────────────────
// Logout
// ─────────────────────────────────────────

export async function logoutController(ctx: Context) {
  const token = ctx.cookie["refresh_token"].value;

  if (token) {
    await logout(token as string);
  }

  clearRefreshTokenCookie(ctx);

  return { success: true, message: "Logged out successfully." };
}

export async function logoutAllController(ctx: Context) {
  // userId is injected by the auth middleware after access token verification.
  const userId = (ctx as any).userId as string;

  await logoutAll(userId);

  clearRefreshTokenCookie(ctx);

  return { success: true, message: "Logged out from all devices." };
}
