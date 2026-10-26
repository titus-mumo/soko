import { db } from "src/db";
import { pageNewestFirst, type Page, type PageParams } from "../../pagination";
import { disputesTable } from "src/schema";
import { eq, and, isNull } from "drizzle-orm";

export type Dispute = typeof disputesTable.$inferSelect;
export type NewDispute = typeof disputesTable.$inferInsert;

export type DisputeStatus = "open" | "under_review" | "resolved" | "closed";

export type FindDisputeResponse = Dispute | "dispute_not_found";

export class DisputeRepository {
  // Paged, newest first: by who raised it, or by status (admin).
  async pageDisputes(
    by: { raisedBy?: string; status?: DisputeStatus },
    params?: PageParams,
  ): Promise<Page<Dispute>> {
    return pageNewestFirst<Dispute>(
      disputesTable,
      and(
        by.raisedBy ? eq(disputesTable.raisedBy, by.raisedBy) : undefined,
        by.status ? eq(disputesTable.status, by.status) : undefined,
        isNull(disputesTable.deletedAt),
      ),
      params,
    );
  }

  async insertDispute(dispute: NewDispute): Promise<Dispute | null> {
    const [res] = await db.insert(disputesTable).values(dispute).returning();

    return res ?? null;
  }

  async findDisputeById(id: string): Promise<FindDisputeResponse> {
    const [res] = await db
      .select()
      .from(disputesTable)
      .where(and(eq(disputesTable.id, id), isNull(disputesTable.deletedAt)));

    if (!res) return "dispute_not_found";

    return res;
  }

  // Returns all disputes raised against an order.
  // Use this on the admin order detail view to surface active disputes.
  async findDisputesByOrderId(orderId: string): Promise<Dispute[]> {
    return await db
      .select()
      .from(disputesTable)
      .where(
        and(
          eq(disputesTable.orderId, orderId),
          isNull(disputesTable.deletedAt),
        ),
      );
  }

  // Returns all disputes raised by a user.
  // Use this for the buyer's dispute history page.
  async findDisputesByRaisedBy(raisedBy: string): Promise<Dispute[]> {
    return await db
      .select()
      .from(disputesTable)
      .where(
        and(
          eq(disputesTable.raisedBy, raisedBy),
          isNull(disputesTable.deletedAt),
        ),
      );
  }

  // Returns all disputes at a given status.
  // Use this for admin pipeline views e.g. triaging open or under_review disputes.
  async findDisputesByStatus(status: DisputeStatus): Promise<Dispute[]> {
    return await db
      .select()
      .from(disputesTable)
      .where(
        and(eq(disputesTable.status, status), isNull(disputesTable.deletedAt)),
      );
  }

  // Advances the dispute status without resolving it.
  // Use this to move a dispute from open -> under_review.
  async updateDisputeStatus(
    id: string,
    status: DisputeStatus,
  ): Promise<FindDisputeResponse> {
    const [res] = await db
      .update(disputesTable)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(disputesTable.id, id), isNull(disputesTable.deletedAt)))
      .returning();

    if (!res) return "dispute_not_found";

    return res;
  }

  // Resolves a dispute by recording the resolution text, stamping resolvedAt,
  // and setting the status to resolved in a single update.
  async resolveDispute(
    id: string,
    resolution: string,
  ): Promise<FindDisputeResponse> {
    const now = new Date();

    const [res] = await db
      .update(disputesTable)
      .set({
        status: "resolved",
        resolution,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(and(eq(disputesTable.id, id), isNull(disputesTable.deletedAt)))
      .returning();

    if (!res) return "dispute_not_found";

    return res;
  }

  // Closes a dispute after resolution has been acknowledged.
  // A closed dispute is considered final and should not be reopened.
  async closeDispute(id: string): Promise<FindDisputeResponse> {
    const [res] = await db
      .update(disputesTable)
      .set({ status: "closed", updatedAt: new Date() })
      .where(and(eq(disputesTable.id, id), isNull(disputesTable.deletedAt)))
      .returning();

    if (!res) return "dispute_not_found";

    return res;
  }

  // Soft delete only — disputes are legal and financial records that
  // must be retained regardless of their resolution outcome.
  async softDeleteDispute(id: string): Promise<boolean> {
    const [res] = await db
      .update(disputesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(disputesTable.id, id), isNull(disputesTable.deletedAt)))
      .returning();

    return !!res;
  }
}
