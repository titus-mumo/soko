"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/utils";
import type { Paged, PageRequest } from "@/lib/paging";

/**
 * A list loaded a page at a time. `reload` starts over (e.g. when a filter
 * changes — pass the filter in `deps`); `loadMore` appends the next page.
 * Responses that arrive after a newer reload are ignored.
 */
export function usePagedList<T>(
  fetchPage: (page: PageRequest) => Promise<Paged<T>>,
  deps: unknown[] = [],
  { pageSize = 20, errorMessage = "Couldn't load this list" } = {},
) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const reload = useCallback(
    async ({ quiet = false } = {}) => {
      const gen = ++generation.current;
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const page = await fetchRef.current({ limit: pageSize });
        if (gen !== generation.current) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setTotal(page.total ?? null);
      } catch (err) {
        if (gen === generation.current)
          setError(apiErrorMessage(err, errorMessage));
      } finally {
        if (gen === generation.current) setLoading(false);
      }
    },
    [pageSize, errorMessage],
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    const gen = generation.current;
    setLoadingMore(true);
    try {
      const page = await fetchRef.current({ limit: pageSize, cursor });
      if (gen !== generation.current) return;
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      if (gen === generation.current)
        setError(apiErrorMessage(err, errorMessage));
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, pageSize, errorMessage]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the caller's filters change
  }, deps);

  return {
    items,
    setItems,
    loading,
    loadingMore,
    error,
    hasMore: cursor !== null,
    /** Total across all pages, when the API reports it. */
    total,
    loadMore,
    reload,
  };
}
