import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface AccessTokenPayload extends JWTPayload {
  userId: string;
  role: "buyer" | "seller" | "admin";
}

export interface RefreshTokenPayload extends JWTPayload {
  userId: string;
  family: string;
  tokenId: string;
}

const accessSecret = new TextEncoder().encode(Bun.env.JWT_ACCESS_SECRET!);
const refreshSecret = new TextEncoder().encode(Bun.env.JWT_REFRESH_SECRET!);

// Access token is short-lived — 15 minutes.
export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessSecret);
}

// Refresh token is long-lived — 7 days.
export async function signRefreshToken(
  payload: RefreshTokenPayload,
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}
