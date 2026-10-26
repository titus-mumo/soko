"use client";

import { useEffect, useState } from "react";
import { getProductReviews, getAverageProductRating } from "@/lib/reviews.api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stars } from "@/components/ui/Stars";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePagedList } from "@/hooks/usePagedList";

/** Reviews for a product. Loaded lazily below the fold. */
export default function ProductReviews({ productId }: { productId: string }) {
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const list = usePagedList(
    (page) => getProductReviews(productId, page),
    [productId],
    { pageSize: 10 },
  );
  const { items: reviews, loading } = list;
  const failed = list.error !== null && reviews.length === 0;

  useEffect(() => {
    getAverageProductRating(productId)
      .then(setAvgRating)
      .catch(() => {});
  }, [productId]);

  if (loading) return <ProductReviewsSkeleton />;

  if (failed) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Couldn&apos;t load reviews right now.
      </p>
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon="star"
        title="No reviews yet"
        description="Buyers can review this product after it's delivered."
        titleAs="h3"
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      {avgRating !== null && avgRating > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {avgRating.toFixed(1)}
          </span>
          <div>
            <Stars rating={avgRating} size={16} />
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {`${reviews.length}${list.hasMore ? "+" : ""} review${reviews.length !== 1 || list.hasMore ? "s" : ""}`}
            </p>
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {r.isVerifiedPurchase ? "Verified buyer" : "Buyer"}
                </p>
                <Stars rating={r.rating} />
              </div>
              <time
                dateTime={r.createdAt}
                className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
              >
                {new Date(r.createdAt).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            </div>
            {r.comment && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {r.comment}
              </p>
            )}
          </li>
        ))}
      </ul>
      <LoadMore
        hasMore={list.hasMore}
        loading={list.loadingMore}
        onLoadMore={list.loadMore}
        label="More reviews"
      />
    </div>
  );
}

export function ProductReviewsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}
