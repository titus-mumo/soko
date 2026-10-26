import { api } from "./api";
import type { ApiResponse } from "./types";

// Lists come from the API a page at a time: `data` is the page and
// `nextCursor` (null on the last page) fetches the next one.

export interface Paged<T> {
  items: T[];
  nextCursor: string | null;
  /** Total matching items, where the API reports it (first page only). */
  total?: number;
}

export interface PageRequest {
  limit?: number;
  cursor?: string | null;
}

type PagedResponse<T> = ApiResponse<T[]> & {
  nextCursor?: string | null;
  total?: number;
};

/** GETs one page of `path`, with any extra query params. */
export async function getPage<T>(
  path: string,
  page: PageRequest = {},
  params: Record<string, string | number | undefined> = {},
): Promise<Paged<T>> {
  const { data } = await api.get<PagedResponse<T>>(path, {
    params: {
      ...params,
      ...(page.limit && { limit: page.limit }),
      ...(page.cursor && { cursor: page.cursor }),
    },
  });
  return {
    items: data.data,
    nextCursor: data.nextCursor ?? null,
    total: data.total,
  };
}

/**
 * Follows a list to the end (up to `maxPages`), for the few screens that
 * genuinely need someone's whole list — e.g. picking an order to review.
 */
export async function getAllPages<T>(
  fetchPage: (page: PageRequest) => Promise<Paged<T>>,
  maxPages = 10,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < maxPages; i++) {
    const page = await fetchPage({ limit: 100, cursor });
    all.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
}
