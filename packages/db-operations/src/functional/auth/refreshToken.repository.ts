import { db } from "src/db";
import { refreshTokensTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

export type RefreshToken = typeof refreshTokensTable.$inferSelect;
export type NewRefreshToken = typeof refreshTokensTable.$inferInsert;

export type FindRefreshTokenResponse =
  | RefreshToken
  | "token_not_found"
  | "token_revoked"
  | "token_expired";

export class RefreshTokenRepository {
  async insertRefreshToken(
    token: NewRefreshToken,
  ): Promise<RefreshToken | null> {
    const [res] = await db.insert(refreshTokensTable).values(token).returning();

    return res ?? null;
  }

  async findRefreshToken(token: string): Promise<FindRefreshTokenResponse> {
    const [res] = await db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.token, token),
          isNull(refreshTokensTable.deletedAt),
        ),
      );

    if (!res) return "token_not_found";
    if (res.isRevoked) return "token_revoked";
    if (res.expiresAt < new Date()) return "token_expired";

    return res;
  }

  async findTokensByUserId(userId: string): Promise<RefreshToken[]> {
    return await db
      .select()
      .from(refreshTokensTable)
      .where(
        and(
          eq(refreshTokensTable.userId, userId),
          isNull(refreshTokensTable.deletedAt),
        ),
      );
  }

  // Revokes a single token on logout from current device.
  async revokeToken(token: string): Promise<boolean> {
    const [res] = await db
      .update(refreshTokensTable)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.token, token),
          isNull(refreshTokensTable.deletedAt),
        ),
      )
      .returning();

    return !!res;
  }

  // Revokes all tokens for a user in one query.
  // Use this on password change, suspicious activity, or logout from all devices.
  async revokeAllUserTokens(userId: string): Promise<boolean> {
    const res = await db
      .update(refreshTokensTable)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.userId, userId),
          eq(refreshTokensTable.isRevoked, false),
          isNull(refreshTokensTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  // Revokes all tokens in a family on token reuse detection.
  // A reused refresh token means a previous token in the chain was stolen —
  // revoking the entire family forces all sessions to re-authenticate.
  async revokeTokenFamily(family: string): Promise<boolean> {
    const res = await db
      .update(refreshTokensTable)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.family, family),
          eq(refreshTokensTable.isRevoked, false),
          isNull(refreshTokensTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  // Soft deletes all expired tokens for a user.
  // Run this periodically to keep the table clean.
  async pruneExpiredTokens(userId: string): Promise<boolean> {
    const res = await db
      .update(refreshTokensTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(refreshTokensTable.userId, userId),
          isNull(refreshTokensTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }
}
