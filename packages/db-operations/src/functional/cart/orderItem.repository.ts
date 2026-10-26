import { db } from "src/db";
import { pageNewestFirst, type Page, type PageParams } from "../../pagination";
import { orderItemsTable, productVariantsTable } from "src/schema";
import { eq, and, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { type OrderStatus } from "./order.repository";

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

export type FindOrderItemResponse = OrderItem | "order_item_not_found";

export class OrderItemRepository {
  /**
   * A seller's numbers, computed in the database (days in Nairobi time):
   * items per status, delivered revenue, distinct orders today / yesterday,
   * and sales per day for the last `days` days (oldest first).
   */
  async sellerStats(sellerId: string, days = 14) {
    const base = and(
      eq(orderItemsTable.sellerId, sellerId),
      isNull(orderItemsTable.deletedAt),
    );
    const localDay = sql`(${orderItemsTable.createdAt} at time zone 'Africa/Nairobi')::date`;
    const today = sql`(now() at time zone 'Africa/Nairobi')::date`;

    const [byStatus, [totals], daily] = await Promise.all([
      db
        .select({
          status: orderItemsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(orderItemsTable)
        .where(base)
        .groupBy(orderItemsTable.status),
      db
        .select({
          revenue: sql<string>`coalesce(sum(${orderItemsTable.subtotal}) filter (where ${orderItemsTable.status} = 'delivered'), 0)::text`,
          ordersToday: sql<number>`count(distinct ${orderItemsTable.orderId}) filter (where ${localDay} = ${today})::int`,
          ordersYesterday: sql<number>`count(distinct ${orderItemsTable.orderId}) filter (where ${localDay} = ${today} - 1)::int`,
        })
        .from(orderItemsTable)
        .where(base),
      db
        .select({
          day: sql<string>`${localDay}::text`,
          total: sql<string>`sum(${orderItemsTable.subtotal})::text`,
        })
        .from(orderItemsTable)
        .where(
          and(
            base,
            notInArray(orderItemsTable.status, ["cancelled", "refunded"]),
            sql`${localDay} > ${today} - ${days}::int`,
          ),
        )
        .groupBy(localDay),
    ]);

    // Fill the days with no sales so the series is always `days` long.
    const byDay = new Map(daily.map((d) => [d.day, Number(d.total)]));
    const nairobiToday = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }),
    );
    const series = Array.from({ length: days }, (_, i) => {
      const d = new Date(nairobiToday);
      d.setDate(d.getDate() - (days - 1 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return byDay.get(key) ?? 0;
    });

    return {
      countsByStatus: Object.fromEntries(
        byStatus.map((r) => [r.status, Number(r.count)]),
      ) as Partial<Record<OrderStatus, number>>,
      revenue: totals?.revenue ?? "0",
      ordersToday: Number(totals?.ordersToday ?? 0),
      ordersYesterday: Number(totals?.ordersYesterday ?? 0),
      daily: series,
    };
  }

  // Units sold per product (items not cancelled or refunded), for the
  // products given — e.g. one page of a seller's listings.
  async unitsSoldByProduct(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const rows = await db
      .select({
        productId: productVariantsTable.productId,
        sold: sql<number>`coalesce(sum(${orderItemsTable.quantity}), 0)::int`,
      })
      .from(orderItemsTable)
      .innerJoin(
        productVariantsTable,
        eq(productVariantsTable.id, orderItemsTable.productVariantId),
      )
      .where(
        and(
          inArray(productVariantsTable.productId, productIds),
          notInArray(orderItemsTable.status, ["cancelled", "refunded"]),
          isNull(orderItemsTable.deletedAt),
        ),
      )
      .groupBy(productVariantsTable.productId);
    return new Map(rows.map((r) => [r.productId, Number(r.sold)]));
  }

  // Paged, newest first: a seller's items, optionally at one status.
  async pageItemsBySellerId(
    sellerId: string,
    status: OrderStatus | undefined,
    params?: PageParams,
  ): Promise<Page<OrderItem>> {
    return pageNewestFirst<OrderItem>(
      orderItemsTable,
      and(
        eq(orderItemsTable.sellerId, sellerId),
        status ? eq(orderItemsTable.status, status) : undefined,
        isNull(orderItemsTable.deletedAt),
      ),
      params,
    );
  }

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

  // Sets an item's status regardless of seller — for the Soko hub (admin).
  async setOrderItemStatus(
    id: string,
    status: OrderStatus,
  ): Promise<FindOrderItemResponse> {
    const [res] = await db
      .update(orderItemsTable)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orderItemsTable.id, id), isNull(orderItemsTable.deletedAt)))
      .returning();

    if (!res) return "order_item_not_found";

    return res;
  }

  // Moves the items of an order that are currently in one of `from` to
  // `to`, leaving the rest (e.g. cancelled items) alone.
  async updateStatusByOrderIdWhere(
    orderId: string,
    from: OrderStatus[],
    to: OrderStatus,
  ): Promise<OrderItem[]> {
    return await db
      .update(orderItemsTable)
      .set({ status: to, updatedAt: new Date() })
      .where(
        and(
          eq(orderItemsTable.orderId, orderId),
          inArray(orderItemsTable.status, from),
          isNull(orderItemsTable.deletedAt),
        ),
      )
      .returning();
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
