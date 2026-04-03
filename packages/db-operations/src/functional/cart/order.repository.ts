import { db } from "src/db";
import { ordersTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type FindOrderResponse = Order | "order_not_found";

export class OrderRepository {
  async insertOrder(order: NewOrder): Promise<Order | null> {
    const [res] = await db.insert(ordersTable).values(order).returning();

    return res ?? null;
  }

  async findOrderById(id: string): Promise<FindOrderResponse> {
    const [res] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), isNull(ordersTable.deletedAt)));

    if (!res) return "order_not_found";

    return res;
  }

  // Scopes the lookup to the buyer to prevent a user from
  // accessing another user's order by guessing an order UUID.
  async findOrderByIdAndBuyerId(
    id: string,
    buyerId: string,
  ): Promise<FindOrderResponse> {
    const [res] = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.id, id),
          eq(ordersTable.buyerId, buyerId),
          isNull(ordersTable.deletedAt),
        ),
      );

    if (!res) return "order_not_found";

    return res;
  }

  // Returns all orders placed by a buyer, most recent first.
  // Use this for the buyer's order history page.
  async findOrdersByBuyerId(buyerId: string): Promise<Order[]> {
    return await db
      .select()
      .from(ordersTable)
      .where(
        and(eq(ordersTable.buyerId, buyerId), isNull(ordersTable.deletedAt)),
      );
  }

  // Returns all orders at a given status.
  // Use this for admin dashboards or order pipeline views.
  async findOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return await db
      .select()
      .from(ordersTable)
      .where(
        and(eq(ordersTable.status, status), isNull(ordersTable.deletedAt)),
      );
  }

  // Returns all orders at a given payment status.
  // Use this for reconciliation flows and payment failure retries.
  async findOrdersByPaymentStatus(
    paymentStatus: PaymentStatus,
  ): Promise<Order[]> {
    return await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.paymentStatus, paymentStatus),
          isNull(ordersTable.deletedAt),
        ),
      );
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
  ): Promise<FindOrderResponse> {
    const [res] = await db
      .update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(ordersTable.id, id), isNull(ordersTable.deletedAt)))
      .returning();

    if (!res) return "order_not_found";

    return res;
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<FindOrderResponse> {
    const [res] = await db
      .update(ordersTable)
      .set({ paymentStatus, updatedAt: new Date() })
      .where(and(eq(ordersTable.id, id), isNull(ordersTable.deletedAt)))
      .returning();

    if (!res) return "order_not_found";

    return res;
  }

  // Updates both statuses in a single query.
  // Use this when a payment event should simultaneously advance the order
  // status e.g. paid -> confirmed, or failed -> cancelled.
  async updateOrderAndPaymentStatus(
    id: string,
    status: OrderStatus,
    paymentStatus: PaymentStatus,
  ): Promise<FindOrderResponse> {
    const [res] = await db
      .update(ordersTable)
      .set({ status, paymentStatus, updatedAt: new Date() })
      .where(and(eq(ordersTable.id, id), isNull(ordersTable.deletedAt)))
      .returning();

    if (!res) return "order_not_found";

    return res;
  }

  // Soft delete only — orders must be retained for financial auditing
  // and dispute resolution even after cancellation or refund.
  async softDeleteOrder(id: string): Promise<boolean> {
    const [res] = await db
      .update(ordersTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(ordersTable.id, id), isNull(ordersTable.deletedAt)))
      .returning();

    return !!res;
  }
}
