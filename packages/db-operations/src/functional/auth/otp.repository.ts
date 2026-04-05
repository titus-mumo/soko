import { db } from "src/db";
import { otpTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

export type Otp = typeof otpTable.$inferSelect;
export type NewOtp = typeof otpTable.$inferInsert;

export type FindOtpResponse =
  | Otp
  | "otp_not_found"
  | "otp_used"
  | "otp_expired";

export class OtpRepository {
  async insertOtp(otp: NewOtp): Promise<Otp | null> {
    const [res] = await db.insert(otpTable).values(otp).returning();

    return res ?? null;
  }

  // Finds the most recent unused OTP for a phone number.
  // Always validate isUsed and expiresAt before trusting the result.
  async findOtpByPhone(phone: string): Promise<FindOtpResponse> {
    const [res] = await db
      .select()
      .from(otpTable)
      .where(and(eq(otpTable.phone, phone), isNull(otpTable.deletedAt)))
      .orderBy(otpTable.createdAt)
      .limit(1);

    if (!res) return "otp_not_found";
    if (res.isUsed) return "otp_used";
    if (res.expiresAt < new Date()) return "otp_expired";

    return res;
  }

  // Marks an OTP as used after successful verification.
  // Always call this immediately after a successful match to prevent replay attacks.
  async markOtpAsUsed(id: string): Promise<boolean> {
    const [res] = await db
      .update(otpTable)
      .set({ isUsed: true, updatedAt: new Date() })
      .where(and(eq(otpTable.id, id), isNull(otpTable.deletedAt)))
      .returning();

    return !!res;
  }

  // Invalidates all previous unused OTPs for a phone before issuing a new one.
  // Call this before insertOtp to prevent accumulation of valid codes.
  async invalidatePreviousOtps(phone: string): Promise<void> {
    await db
      .update(otpTable)
      .set({ isUsed: true, updatedAt: new Date() })
      .where(
        and(
          eq(otpTable.phone, phone),
          eq(otpTable.isUsed, false),
          isNull(otpTable.deletedAt),
        ),
      );
  }

  // Soft deletes all OTPs for a phone number.
  // Use this for periodic cleanup of expired or used codes.
  async pruneOtpsByPhone(phone: string): Promise<boolean> {
    const res = await db
      .update(otpTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(otpTable.phone, phone), isNull(otpTable.deletedAt)))
      .returning();

    return res.length > 0;
  }
}
