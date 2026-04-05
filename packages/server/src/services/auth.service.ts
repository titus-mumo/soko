import { getRepositories } from "../lib/repositories";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { sendOtp, verifyOtpWithTwilio } from "../lib/twilio";
import { getGoogleAuthUrl, getGoogleUser } from "../lib/google";
import type { PublicUser } from "db-operations";

const {
  userRepository,
  refreshTokenRepository,
  otpRepository,
  notificationRepository,
} = getRepositories();

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

// Generates both tokens and persists the refresh token to the DB.
// Always call this instead of signing tokens directly.
async function issueTokens(
  userId: string,
  role: "buyer" | "seller" | "admin",
  family: string,
  meta: { userAgent?: string; ip?: string },
): Promise<AuthTokens> {
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ userId, role }),
    signRefreshToken({ userId, family, tokenId }),
  ]);

  // Persist refresh token to DB for revocation tracking.
  await refreshTokenRepository.insertRefreshToken({
    userId,
    token: refreshToken,
    family,
    expiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return { accessToken, refreshToken };
}

// ─────────────────────────────────────────
// Email + Password
// ─────────────────────────────────────────

export async function registerWithEmail(
  data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  },
  meta: { userAgent?: string; ip?: string },
): Promise<AuthResponse | "email_already_exists" | "phone_already_exists"> {
  // Check for existing email or phone before inserting.
  const existingEmail = await userRepository.findUserByEmail(data.email);
  if (existingEmail !== "user_not_found") return "email_already_exists";

  const existingPhone = await userRepository.findUserByPhone(data.phone);
  if (existingPhone !== "user_not_found") return "phone_already_exists";

  const user = await userRepository.insertUser({
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash: data.password, // hashed inside the repository
    role: "buyer",
  });

  if (!user) throw new Error("Failed to create user");

  const family = crypto.randomUUID();
  const tokens = await issueTokens(user.id, user.role, family, meta);

  // Send welcome notification.
  await notificationRepository.insertNotification({
    userId: user.id,
    type: "welcome",
    title: "Welcome to Soko!",
    body: "Your account has been created successfully.",
    channel: "push",
  });

  return { user, tokens };
}

export async function loginWithEmail(
  data: { email: string; password: string },
  meta: { userAgent?: string; ip?: string },
): Promise<AuthResponse | "user_not_found" | "incorrect_password"> {
  const result = await userRepository.findUserByEmailOrPhone(
    data.email,
    data.password,
  );

  if (result === "user_not_found") return "user_not_found";
  if (result === "incorrect_password") return "incorrect_password";
  if (result === "something_went_wrong") throw new Error("Auth error");

  const family = crypto.randomUUID();
  const tokens = await issueTokens(result.id, result.role, family, meta);

  return { user: result, tokens };
}

// ─────────────────────────────────────────
// Phone OTP
// ─────────────────────────────────────────

export async function requestOtp(
  phone: string,
): Promise<"otp_sent" | "failed_to_send"> {
  // Twilio Verify handles code generation, storage, and expiry internally.
  const sent = await sendOtp(phone);
  if (!sent) return "failed_to_send";
  return "otp_sent";
}

export async function verifyOtp(
  data: {
    phone: string;
    code: string;
    name?: string;
  },
  meta: { userAgent?: string; ip?: string },
): Promise<
  | AuthResponse
  | "otp_incorrect"
  | "otp_expired"
  | "name_required"
  | "otp_not_found"
  | "otp_used"
> {
  // Verify directly with Twilio — no DB lookup needed.
  const isValid = await verifyOtpWithTwilio(data.phone, data.code);
  if (!isValid) return "otp_incorrect";

  let user = await userRepository.findUserByPhone(data.phone);

  if (user === "user_not_found") {
    if (!data.name) return "name_required";

    const created = await userRepository.insertUser({
      name: data.name,
      phone: data.phone,
      email: `${data.phone}@placeholder.soko`,
      role: "buyer",
    });

    if (!created) throw new Error("Failed to create user");
    user = created;

    await notificationRepository.insertNotification({
      userId: user.id,
      type: "welcome",
      title: "Welcome to Soko!",
      body: "Your account has been created successfully.",
      channel: "push",
    });
  }

  if (typeof user === "string") throw new Error("Auth error");

  const family = crypto.randomUUID();
  const tokens = await issueTokens(user.id, user.role, family, meta);

  return { user, tokens };
}

// ─────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────

export async function getGoogleRedirectUrl(): Promise<string> {
  return getGoogleAuthUrl();
}

export async function handleGoogleCallback(
  code: string,
  meta: { userAgent?: string; ip?: string },
): Promise<AuthResponse | "google_auth_failed"> {
  const googleUser = await getGoogleUser(code);
  if (!googleUser) return "google_auth_failed";

  // Find existing user by email or create a new one.
  let user = await userRepository.findUserByEmail(googleUser.email);

  if (user === "user_not_found") {
    const created = await userRepository.insertUser({
      name: googleUser.name,
      email: googleUser.email,
      phone: `google_${googleUser.googleId}`, // placeholder until user sets phone
      role: "buyer",
      isVerified: true, // Google accounts are pre-verified
      profilePhoto: googleUser.picture,
    });

    if (!created) throw new Error("Failed to create user");
    user = created;

    await notificationRepository.insertNotification({
      userId: user.id,
      type: "welcome",
      title: "Welcome to Soko!",
      body: "Your account has been created successfully.",
      channel: "push",
    });
  }

  if (typeof user === "string") throw new Error("Auth error");

  const family = crypto.randomUUID();
  const tokens = await issueTokens(user.id, user.role, family, meta);

  return { user, tokens };
}

// ─────────────────────────────────────────
// Token Refresh
// ─────────────────────────────────────────

export async function refreshTokens(
  token: string,
  meta: { userAgent?: string; ip?: string },
): Promise<AuthTokens | "token_not_found" | "token_revoked" | "token_expired"> {
  // Verify the JWT signature first before hitting the DB.
  const payload = await verifyRefreshToken(token);
  if (!payload) return "token_expired";

  const stored = await refreshTokenRepository.findRefreshToken(token);

  if (stored === "token_not_found") return "token_not_found";
  if (stored === "token_revoked") {
    // Token reuse detected — revoke the entire family to invalidate all sessions.
    await refreshTokenRepository.revokeTokenFamily(payload.family);
    return "token_revoked";
  }
  if (stored === "token_expired") return "token_expired";

  // Revoke the used token before issuing a new one (refresh token rotation).
  await refreshTokenRepository.revokeToken(token);

  const user = await userRepository.findUserById(payload.userId);
  if (!user) throw new Error("User not found");

  // Reuse the same family so the token chain stays traceable.
  const tokens = await issueTokens(
    payload.userId,
    user.role,
    payload.family,
    meta,
  );

  return tokens;
}

// ─────────────────────────────────────────
// Logout
// ─────────────────────────────────────────

export async function logout(refreshToken: string): Promise<void> {
  await refreshTokenRepository.revokeToken(refreshToken);
}

export async function logoutAll(userId: string): Promise<void> {
  // Revokes all sessions across all devices for this user.
  await refreshTokenRepository.revokeAllUserTokens(userId);
}
