import { db } from "src/db";
import { orderItemsTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";
import { type OrderStatus } from "./order.repository";

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

export type FindOrderItemResponse = OrderItem | "order_item_not_found";

export class OrderItemRepository {
  async insertOrderItem(item: NewOrderItem): Promise<OrderItem | null> {
    const [res] = await db.insert(orderItemsTable).values(item).returning();

    return res ?? null;
  }

  // Bulk insert for creating all items in an order at once.
  // Always use this over insertOrderItem when placing an order
  // to avoid multiple round trips to the database.
  async insertOrderItems(items: NewOrderItem[]): Promise<OrderItem[]> {
    if (items.length === 0) return [];

    return await db.insert(orderItemsTable).values(items).returning();
  }

  async findOrderItemById(id: string): Promise<FindOrderItemResponse> {
    const [res] = await db
      .select()
      .from(orderItemsTable)
      .where(
        and(eq(orderItemsTable.id, id), isNull(orderItemsTable.deletedAt)),
      );

    if (!res) return "order_item_not_found";

    return res;
  }

  // Returns all items belonging to an order.
  // Use this to render the order detail view or calculate per-seller totals.
  async findItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItemsTable)
      .where(
        and(
          eq(orderItemsTable.orderId, orderId),
          isNull(orderItemsTable.deletedAt),
        ),
      );
  }

  // Returns all items assigned to a seller across all orders.
  // Use this for the seller's incoming orders dashboard.
  async findItemsBySellerId(sellerId: string): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItemsTable)
      .where(
        and(
          eq(orderItemsTable.sellerId, sellerId),
          isNull(orderItemsTable.deletedAt),
        ),
      );
  }

  // Returns seller items filtered by status.
  // Use this to power seller pipeline views e.g. "items to ship".
  async findItemsBySellerIdAndStatus(
    sellerId: string,
    status: OrderStatus,
  ): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItemsTable)
      .where(
        and(
          eq(orderItemsTable.sellerId, sellerId),
          eq(orderItemsTable.status, status),
          isNull(orderItemsTable.deletedAt),
        ),
      );
  }

  // Updates the status of a single order item.
  // Sellers advance their own items independently — e.g. one seller
  // ships while another is still processing on a multi-seller order.
  async updateOrderItemStatus(
    id: string,
    sellerId: string,
    status: OrderStatus,
  ): Promise<FindOrderItemResponse> {
    const [res] = await db
      .update(orderItemsTable)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(orderItemsTable.id, id),
          eq(orderItemsTable.sellerId, sellerId),
          isNull(orderItemsTable.deletedAt),
        ),
      )
      .returning();

    if (!res) return "order_item_not_found";

    return res;
  }

  // Advances all items in an order to the same status in one query.
  // Use this for admin-level bulk transitions e.g. cancelling an entire order.
  async updateStatusByOrderId(
    orderId: string,
    status: OrderStatus,
  ): Promise<boolean> {
    const res = await db
      .update(orderItemsTable)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(orderItemsTable.orderId, orderId),
          isNull(orderItemsTable.deletedAt),
        ),
      )
      .returning();

    return res.length > 0;
  }

  // Soft delete only — order items are financial records and must be
  // retained for auditing, disputes, and seller payout reconciliation.
  async softDeleteOrderItem(id: string): Promise<boolean> {
    const [res] = await db
      .update(orderItemsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(orderItemsTable.id, id), isNull(orderItemsTable.deletedAt)))
      .returning();

    return !!res;
  }
}
