import { Skeleton } from "./Skeleton";
import { ProductGridSkeleton } from "@/components/skeletons";

type Variant = "list" | "grid" | "detail" | "form" | "dashboard" | "centered";

/** Route-level loading placeholders, shaped like the page they stand in for. */
export function PageSkeleton({ variant = "list" }: { variant?: Variant }) {
  if (variant === "centered") {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-brand-600 dark:border-zinc-700" />
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading"
      aria-busy="true"
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      {variant === "grid" && <ProductGridSkeleton />}

      {variant === "list" && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {variant === "detail" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square max-h-[28rem] rounded-md" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      )}

      {variant === "form" && (
        <div className="max-w-lg space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9" />
            </div>
          ))}
          <Skeleton className="h-9 w-32" />
        </div>
      )}

      {variant === "dashboard" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
