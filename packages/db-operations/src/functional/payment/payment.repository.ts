import { db } from "src/db";
import { paymentsTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

import { type PaymentStatus } from "../cart/order.repository";

export type Payment = typeof paymentsTable.$inferSelect;
export type NewPayment = typeof paymentsTable.$inferInsert;

export type FindPaymentResponse = Payment | "payment_not_found";

export class PaymentRepository {
  async insertPayment(payment: NewPayment): Promise<Payment | null> {
    const [res] = await db.insert(paymentsTable).values(payment).returning();

    return res ?? null;
  }

  async findPaymentById(id: string): Promise<FindPaymentResponse> {
    const [res] = await db
      .select()
      .from(paymentsTable)
      .where(and(eq(paymentsTable.id, id), isNull(paymentsTable.deletedAt)));

    if (!res) return "payment_not_found";

    return res;
  }

  async findPaymentByOrderId(orderId: string): Promise<FindPaymentResponse> {
    const [res] = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.orderId, orderId),
          isNull(paymentsTable.deletedAt),
        ),
      );

    if (!res) return "payment_not_found";

    return res;
  }

  // Stores the Daraja access token and its expiry after a successful
  // auth call. Check expiresAt before calling this to reuse a valid token.
  async updateAccessToken(
    orderId: string,
    accessToken: string,
    expiresAt: Date,
  ): Promise<FindPaymentResponse> {
    const [res] = await db
      .update(paymentsTable)
      .set({ accessToken, expiresAt, updatedAt: new Date() })
      .where(
        and(
          eq(paymentsTable.orderId, orderId),
          isNull(paymentsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "payment_not_found";

    return res;
  }

  // Called after a successful STK push to record request metadata.
  // metadata should include CheckoutRequestID, MerchantRequestID,
  // and any other fields you need to match against the callback.
  async updateMetadata(
    orderId: string,
    metadata: Record<string, unknown>,
  ): Promise<FindPaymentResponse> {
    const [res] = await db
      .update(paymentsTable)
      .set({ metadata, updatedAt: new Date() })
      .where(
        and(
          eq(paymentsTable.orderId, orderId),
          isNull(paymentsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "payment_not_found";

    return res;
  }

  // Called from the Daraja callback handler. Stores the raw callback,
  // flips paid to true, and advances status to paid in one update.
  async markAsPaid(
    orderId: string,
    callbackData: Record<string, unknown>,
  ): Promise<FindPaymentResponse> {
    const [res] = await db
      .update(paymentsTable)
      .set({
        status: "paid",
        paid: true,
        callbackData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentsTable.orderId, orderId),
          isNull(paymentsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "payment_not_found";

    return res;
  }

  // Called when Daraja returns a failed result code in the callback.
  // callbackData is stored for debugging even on failure.
  async markAsFailed(
    orderId: string,
    callbackData: Record<string, unknown>,
  ): Promise<FindPaymentResponse> {
    const [res] = await db
      .update(paymentsTable)
      .set({
        status: "failed",
        paid: false,
        callbackData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentsTable.orderId, orderId),
          isNull(paymentsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "payment_not_found";

    return res;
  }

  async updatePaymentStatus(
    orderId: string,
    status: PaymentStatus,
  ): Promise<FindPaymentResponse> {
    const [res] = await db
      .update(paymentsTable)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(paymentsTable.orderId, orderId),
          isNull(paymentsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "payment_not_found";

    return res;
  }

  // Soft delete only — payment records are financial data and must
  // be retained for reconciliation, auditing, and dispute resolution.
  async softDeletePayment(id: string): Promise<boolean> {
    const [res] = await db
      .update(paymentsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(paymentsTable.id, id), isNull(paymentsTable.deletedAt)))
      .returning();

    return !!res;
  }
}
