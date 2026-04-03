import { db } from "src/db";
import { paymentLogsTable } from "src/schema";
import { eq } from "drizzle-orm";

export type PaymentLog = typeof paymentLogsTable.$inferSelect;
export type NewPaymentLog = typeof paymentLogsTable.$inferInsert;

export class PaymentLogRepository {
  // Inserts a raw Safaricom callback as an immutable audit log entry.
  // Call this immediately on callback receipt before any processing.
  async insertPaymentLog(
    orderId: string,
    rawCallback: Record<string, unknown>,
  ): Promise<PaymentLog | null> {
    const [res] = await db
      .insert(paymentLogsTable)
      .values({ orderId, rawCallback })
      .returning();

    return res ?? null;
  }

  // Returns all raw callbacks received for an order.
  // Use this to debug duplicate or out-of-order callbacks from Safaricom.
  async findLogsByOrderId(orderId: string): Promise<PaymentLog[]> {
    return await db
      .select()
      .from(paymentLogsTable)
      .where(eq(paymentLogsTable.orderId, orderId));
  }
}
