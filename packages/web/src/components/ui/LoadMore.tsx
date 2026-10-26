"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";

/**
 * "Load more" for a paged list, with progress ("Showing 24 of 107") when the
 * total is known. With `auto`, it also loads when scrolled into view
 * (infinite scroll); the button stays for keyboard and screen-reader users.
 */
export function LoadMore({
  hasMore,
  loading,
  onLoadMore,
  label = "Load more",
  shown,
  total,
  auto = false,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  label?: string;
  /** Items loaded so far, for the progress line. */
  shown?: number;
  total?: number | null;
  auto?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(onLoadMore);
  latest.current = onLoadMore;

  useEffect(() => {
    if (
      !auto ||
      !hasMore ||
      !ref.current ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && latest.current(),
      { rootMargin: "400px 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [hasMore, auto]);

  const progress =
    shown !== undefined && total ? (
      <p
        className="text-xs text-zinc-500 dark:text-zinc-400"
        aria-live="polite"
      >
        Showing <span className="tabular font-mono">{shown}</span> of{" "}
        <span className="tabular font-mono">{total}</span>
      </p>
    ) : null;

  if (!hasMore)
    return progress && shown! > 0 ? (
      <div className="flex justify-center pt-6">{progress}</div>
    ) : null;
  return (
    <div ref={ref} className="flex flex-col items-center gap-2 pt-6">
      {progress}
      {total && progress ? (
        <div
          aria-hidden="true"
          className="h-1 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width]"
            style={{ width: `${Math.min(100, (shown! / total) * 100)}%` }}
          />
        </div>
      ) : null}
      <Button variant="secondary" isLoading={loading} onClick={onLoadMore}>
        {label}
      </Button>
    </div>
  );
}
