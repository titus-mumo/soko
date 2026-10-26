import { and, desc, eq, lt, or, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "./db";

// Cursor ("keyset") pagination, newest first. A cursor marks the last row a
// client has seen, so pages stay correct while new rows arrive — unlike
// page numbers, nothing shifts or repeats.

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageParams {
  limit?: number;
  cursor?: string | null;
}

export interface Page<T> {
  items: T[];
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
  /** Matching items across all pages — only where cheap, on the first page. */
  total?: number;
}

export function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_PAGE_SIZE);
}

/** Opaque cursor from a sort value and the row id (the tiebreak). */
export function encodeCursor(
  value: string | number | Date,
  id: string,
): string {
  const v = value instanceof Date ? value.toISOString() : String(value);
  return Buffer.from(JSON.stringify([v, id])).toString("base64url");
}

/** Null for a missing or malformed cursor (treated as the first page). */
export function decodeCursor(cursor?: string | null): [string, string] | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString());
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === "string" &&
      typeof parsed[1] === "string"
    )
      return parsed as [string, string];
  } catch {
    // fall through
  }
  return null;
}

/** Splits a limit+1 fetch into a page and the cursor for the next one. */
export function toPage<T>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): Page<T> {
  const items = rows.slice(0, limit);
  return {
    items,
    nextCursor: rows.length > limit ? cursorOf(items[items.length - 1]) : null,
  };
}

type Timestamped = PgTable & { id: PgColumn; createdAt: PgColumn };

/**
 * One page of `table` rows matching `where`, newest first (createdAt, then
 * id to break ties).
 */
export async function pageNewestFirst<
  T extends { id: string; createdAt: Date },
>(
  table: Timestamped,
  where: SQL | undefined,
  params: PageParams = {},
): Promise<Page<T>> {
  const limit = clampLimit(params.limit);
  const after = decodeCursor(params.cursor);
  const keyset = after
    ? or(
        lt(table.createdAt, new Date(after[0])),
        and(eq(table.createdAt, new Date(after[0])), lt(table.id, after[1])),
      )
    : undefined;

  const rows = (await db
    .select()
    .from(table)
    .where(and(where, keyset))
    .orderBy(desc(table.createdAt), desc(table.id))
    .limit(limit + 1)) as unknown as T[];

  return toPage(rows, limit, (r) => encodeCursor(r.createdAt, r.id));
}
