import { Skeleton } from "@/components/ui/Skeleton";
import { cardClasses } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// Loading placeholders. Each mirrors the markup of the component it stands
// in for — same wrappers, paddings and line heights — so nothing jumps when
// the real content arrives.

/** Matches <ProductCard>: square image, two name lines, seller, price. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="flex flex-1 flex-col gap-1 px-0.5 pt-3">
        {/* text-sm leading-snug ≈ 18px per line, two lines */}
        <Skeleton className="h-[14px] w-3/4" />
        <Skeleton className="mt-1 h-[14px] w-1/2" />
        <Skeleton className="mt-1.5 h-3 w-1/3" />
        <Skeleton className="mt-2 h-4 w-1/4 bg-brand-600/20 dark:bg-brand-500/15" />
      </div>
    </div>
  );
}

/** The product grid with `count` card placeholders. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

const PILL_WIDTHS = ["w-32", "w-24", "w-28", "w-20", "w-36", "w-24"];

/** A row of category pills (h-10, rounded-full) of varying widths. */
export function CategoryPillSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden" aria-hidden="true">
      {PILL_WIDTHS.map((w, i) => (
        <Skeleton key={i} className={cn("h-10 shrink-0 rounded-full", w)} />
      ))}
    </div>
  );
}

/** One orders-table row: ID, placed, status, payment, total, chevron. */
export function OrderRowSkeleton() {
  return (
    <tr aria-hidden="true">
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-6 w-24 rounded-full" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="ml-auto h-4 w-24" />
      </td>
      <td className="w-10 px-3 py-4">
        <Skeleton className="h-4 w-4" />
      </td>
    </tr>
  );
}

/** Mobile order card: ID + status on top, date/payment and total below. */
export function OrderCardSkeleton() {
  return (
    <div className={cardClasses({ className: "p-4" })} aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}

/** The orders list: table on md+, cards on mobile. */
export function OrdersListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading orders">
      <div
        className={cardClasses({
          padded: false,
          className: "hidden overflow-hidden md:block",
        })}
      >
        <table className="w-full">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
            <tr>
              {["w-12", "w-14", "w-12", "w-16", "w-10"].map((w, i) => (
                <th key={i} className="px-5 py-3">
                  <Skeleton className={cn("h-3", w, i === 4 && "ml-auto")} />
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {Array.from({ length: rows }).map((_, i) => (
              <OrderRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** One notification row: icon tile, title + body, timestamp. */
function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 border-l-2 border-transparent py-4 pl-4 pr-3 sm:pl-5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <Skeleton className="h-8 w-8 shrink-0 rounded-lg opacity-0" />
    </div>
  );
}

/** A date group of notifications. */
export function NotificationSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading notifications">
      <Skeleton className="mb-3 h-3 w-14" />
      <div
        className={cardClasses({
          padded: false,
          className:
            "divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800",
        })}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <NotificationRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Profile header card (avatar, name, email, badge) and three detail rows. */
export function ProfileSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading profile">
      <div className={cardClasses({ className: "flex items-center gap-5" })}>
        <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-52 max-w-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <div className={cardClasses({ padded: false })}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-3 w-20 shrink-0 sm:w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Dashboard stat tile: label + icon, big number, hint line. */
export function DashboardStatSkeleton() {
  return (
    <div
      className={cardClasses({ className: "relative overflow-hidden" })}
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex items-start justify-between">
        <Skeleton className="mt-1 h-3 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-2 h-9 w-20" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

/** Page title + description, matching <PageHeader>. */
export function PageHeaderSkeleton({
  description = true,
}: {
  description?: boolean;
}) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      <Skeleton className="h-8 w-56 max-w-full sm:h-9" />
      {description && <Skeleton className="h-5 w-72 max-w-full" />}
    </div>
  );
}

/** Product page: square gallery + buy box. */
export function ProductDetailSkeleton() {
  return (
    <div className="space-y-12" role="status" aria-label="Loading product">
      <Skeleton className="h-4 w-64 max-w-full" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] w-[4.5rem] rounded-lg" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-9 w-4/5 sm:h-10" />
          <Skeleton className="mt-2 h-9 w-1/2 sm:h-10" />
          <Skeleton className="mt-4 h-4 w-40" />
          <Skeleton className="mt-6 h-9 w-44" />
          <Skeleton className="mt-8 h-3 w-16" />
          <div className="mt-3 flex gap-2">
            {["w-20", "w-24", "w-16"].map((w) => (
              <Skeleton key={w} className={cn("h-10 rounded-full", w)} />
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <Skeleton className="h-11 w-[7.5rem] rounded-lg" />
            <Skeleton className="h-11 flex-1 rounded-lg" />
          </div>
          <Skeleton className="mt-8 h-[9.5rem] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Order page: back link, title, progress, items + side cards. */
export function OrderDetailSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading order">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-9 w-64 max-w-full" />
      </div>
      <Skeleton className="h-[5.25rem] rounded-xl" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={cardClasses({ padded: false })}>
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <Skeleton className="h-5 w-20" />
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 border-b border-zinc-100 px-5 py-5 last:border-0 dark:border-zinc-800"
            >
              <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Cart: three line items + the order summary card. */
export function CartSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading cart">
      <PageHeaderSkeleton />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div
          className={cardClasses({
            padded: false,
            className: "divide-y divide-zinc-100 dark:divide-zinc-800",
          })}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 sm:p-5">
              <Skeleton className="h-20 w-20 shrink-0 rounded-lg sm:h-24 sm:w-24" />
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <Skeleton className="h-9 w-[6.5rem] rounded-lg" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={cardClasses()}>
          <Skeleton className="h-6 w-36" />
          <div className="mt-5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="mt-6 h-5 w-full" />
          <div className="mt-5 flex justify-between border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="mt-5 h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Dashboard: header, four stat tiles, then a list block. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-12" role="status" aria-label="Loading dashboard">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardStatSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div
          className={cardClasses({
            padded: false,
            className: "divide-y divide-zinc-100 dark:divide-zinc-800",
          })}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="hidden h-10 w-10 rounded-lg sm:block" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
