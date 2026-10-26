import type { Page, PageParams } from "db-operations";

/**
 * Reads `?limit=` and `?cursor=` (both optional). Invalid limits fall back
 * to the default page size; the repository clamps to the maximum.
 */
export function pageParams(
  query: Record<string, unknown> | undefined,
): PageParams {
  const limit = Number(query?.limit);
  const cursor = typeof query?.cursor === "string" ? query.cursor : undefined;
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    cursor,
  };
}

/**
 * The response for a page: `data` stays an array (as before pagination),
 * with the cursor for the next page alongside. `nextCursor` is null on the
 * last page.
 */
export function paged<T, V = T>(page: Page<T>, view?: (item: T) => V) {
  return {
    success: true as const,
    data: view ? page.items.map(view) : page.items,
    nextCursor: page.nextCursor,
    ...(page.total !== undefined && { total: page.total }),
  };
}
