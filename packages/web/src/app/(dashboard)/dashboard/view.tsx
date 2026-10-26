"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardStatSkeleton } from "@/components/skeletons";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { getCartSummary } from "@/lib/cart.api";
import {
  getBuyerOrderStats,
  getBuyerOrders,
  getSellerOrderItemsByStatus,
  getSellerStats,
  type SellerStats,
} from "@/lib/orders.api";
import { getUserAddresses } from "@/lib/profile.api";
import { getSellerProfile } from "@/lib/seller.api";
import { getVariantDetailsMap } from "@/lib/products.api";
import { getRecentlyViewed, type RecentProduct } from "@/lib/recently-viewed";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { FeaturedProductsSkeleton } from "@/components/products/FeaturedProducts";
import { Skeleton } from "@/components/ui/Skeleton";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader, Section } from "@/components/ui/PageHeader";
import { cardClasses } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  apiErrorMessage,
  cn,
  formatKES,
  orderRef,
  relativeTime,
} from "@/lib/utils";
import type {
  Order,
  SellerOrderItem,
  OrderStatus,
  SellerProfile,
  VariantDetails,
} from "@/lib/types";

// Below the fold and request-heavy — load after the rest of the dashboard.
const FeaturedProducts = dynamic(
  () => import("@/components/products/FeaturedProducts"),
  { ssr: false, loading: () => <FeaturedProductsSkeleton /> },
);

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function ViewAll({
  href,
  label = "View all",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
    >
      {label}
      <Icon name="arrow-right" size={14} />
    </Link>
  );
}

/** Change vs. a previous period, as a rounded percentage; null if not comparable. */
function percentChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

function Trend({ change, period }: { change: number | null; period: string }) {
  if (change === null) return null;
  const up = change >= 0;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 font-mono text-xs font-medium",
        up ? "text-green-500" : "text-red-500",
      )}
    >
      <Icon
        name={up ? "arrow-up-right" : "arrow-down-right"}
        size={12}
        strokeWidth={2}
      />
      {Math.abs(change)}%
      <span className="sr-only">
        {up ? " up" : " down"} {period}
      </span>
    </span>
  );
}

/** KPI card: green accent bar, uppercase label, mono metric, icon tile. */
function StatTile({
  label,
  value,
  hint,
  icon,
  href,
  trend,
  children,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: IconName;
  href?: string;
  /** Trend badge shown beside the value. */
  trend?: React.ReactNode;
  /** Extra content under the hint (e.g. a sparkline). */
  children?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-brand-600"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
          {label}
        </p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600 dark:text-brand-500">
          <Icon name={icon} size={20} strokeWidth={1.5} />
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="tabular font-mono text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {value}
        </span>
        {trend}
      </div>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      {children}
    </>
  );
  const classes = cardClasses({
    variant: href ? "hover" : "base",
    className: cn("relative block overflow-hidden", className),
  });
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

function StatSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <DashboardStatSkeleton key={i} />
      ))}
    </>
  );
}

// ─── Buyer view ───────────────────────────────────────────────────────────────

function RecentlyViewed() {
  // localStorage is browser-only; read after mount to keep hydration stable.
  const [items, setItems] = useState<RecentProduct[]>([]);
  useEffect(() => setItems(getRecentlyViewed()), []);
  if (items.length === 0) return null;

  return (
    <Section id="continue" title="Continue shopping">
      <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {items.map((p) => (
          <li key={p.slug} className="w-36 shrink-0 snap-start sm:w-40">
            <Link
              href={`/products/${p.slug}`}
              className="group block rounded-xl"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-inset ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/5">
                {p.image ? (
                  <SafeImage
                    src={p.image}
                    alt=""
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-700">
                    <Icon name="image" size={24} />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {p.name}
              </p>
              {p.price != null && <Price amount={p.price} size="sm" />}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function BuyerDashboard({ name }: { name?: string }) {
  const [cartCount, setCartCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [hello, setHello] = useState("Welcome back");

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    setOrdersError(null);
    Promise.all([
      getCartSummary()
        .then((s) => setCartCount(s.itemCount))
        // No cart yet (404) just means an empty cart.
        .catch(() => setCartCount(0)),
      getUserAddresses()
        .then((a) => setAddressCount(a.length))
        .catch(() => {}),
      // Just the three most recent; the totals are counted by the API.
      getBuyerOrders({ limit: 3 })
        .then((page) => setOrders(page.items))
        .catch((err) =>
          setOrdersError(apiErrorMessage(err, "Couldn't load your orders")),
        ),
      getBuyerOrderStats()
        .then(setOrderStats)
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Time of day is the viewer's, so compute it on the client.
    setHello(greeting());
  }, [load]);
  useRefetchOnFocus(() => load(true));

  const firstName = name?.split(" ")[0];
  const { active } = orderStats;

  return (
    <div className="space-y-12">
      <PageHeader
        title={firstName ? `${hello}, ${firstName}` : hello}
        description={
          active > 0
            ? `You have ${active} order${active === 1 ? "" : "s"} on the way.`
            : "Here's what's happening with your account."
        }
        actions={
          <ButtonLink href="/products" variant="secondary">
            <Icon name="search" />
            Browse products
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {loading ? (
          <StatSkeletons count={3} />
        ) : (
          <>
            <StatTile
              label="Orders placed"
              value={orderStats.total}
              hint={active > 0 ? `${active} in progress` : "None in progress"}
              icon="package"
              href="/orders"
            />
            <StatTile
              label="In your cart"
              value={cartCount}
              hint={cartCount > 0 ? "Ready to check out" : "Your cart is empty"}
              icon="cart"
              href="/cart"
            />
            <StatTile
              label="Saved addresses"
              value={addressCount}
              hint={
                addressCount > 0
                  ? "For faster checkout"
                  : "Add one before checkout"
              }
              icon="pin"
              href="/profile/addresses"
            />
          </>
        )}
      </div>

      <RecentlyViewed />

      <Section
        id="recent-orders"
        title="Recent orders"
        action={orders.length > 0 ? <ViewAll href="/orders" /> : undefined}
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
            ))}
          </div>
        ) : ordersError ? (
          <ErrorState message={ordersError} onRetry={() => load()} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon="bag"
            title="No orders yet"
            description="When you buy something, you can follow it here from payment to your door."
            titleAs="h3"
            action={
              <ButtonLink href="/products" size="sm">
                Start shopping
              </ButtonLink>
            }
          />
        ) : (
          <ul
            className={cardClasses({
              padded: false,
              className:
                "divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800",
            })}
          >
            {orders.slice(0, 3).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 focus-visible:ring-inset dark:hover:bg-zinc-800/40"
                >
                  <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 sm:flex">
                    <Icon name="receipt" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {orderRef(order.id)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      <time dateTime={order.createdAt}>
                        {relativeTime(order.createdAt)}
                      </time>
                    </p>
                  </div>
                  <Price
                    amount={order.totalAmount}
                    size="sm"
                    className="hidden sm:inline-flex"
                  />
                  <OrderStatusBadge status={order.status} />
                  <Icon
                    name="chevron-right"
                    className="shrink-0 text-zinc-300 dark:text-zinc-600"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="new-arrivals"
        title="New arrivals"
        action={<ViewAll href="/products" label="Browse all" />}
      >
        <FeaturedProducts />
      </Section>
    </div>
  );
}

// ─── Seller view ──────────────────────────────────────────────────────────────

// The seller's part of fulfilment, up to the hub.
const PIPELINE: { status: OrderStatus; label: string; dot: string }[] = [
  { status: "confirmed", label: "To prepare", dot: "bg-blue-500" },
  { status: "processing", label: "Packing", dot: "bg-indigo-500" },
  { status: "dropped_off", label: "Dropped off", dot: "bg-amber-500" },
  { status: "at_hub", label: "At hub", dot: "bg-purple-500" },
];

const SPARK_DAYS = 14;

function Sparkline({ values }: { values: number[] }) {
  const w = 280;
  const h = 64;
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const points = values.map(
    (v, i) => [i * step, h - 4 - (v / max) * (h - 8)] as const,
  );
  const line = points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-16 w-full overflow-visible"
      role="img"
      aria-label={`Sales over the last ${values.length} days, KES ${total.toLocaleString("en-KE")} in total`}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(22 163 74)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="rgb(22 163 74)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path
        d={line}
        fill="none"
        stroke="rgb(22 163 74)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function SellerDashboard() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
  // The newest few items in each pipeline stage; counts come from the stats.
  const [pipeline, setPipeline] = useState<
    Partial<Record<OrderStatus, SellerOrderItem[]>>
  >({});
  const [details, setDetails] = useState<Record<string, VariantDetails>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    Promise.all([
      getSellerProfile()
        .then(setProfile)
        .catch(() => {}),
      getSellerStats()
        .then(setSellerStats)
        .catch(() => {}),
      Promise.all(
        PIPELINE.map((stage) =>
          getSellerOrderItemsByStatus(stage.status, { limit: 3 }).then(
            (page) => [stage.status, page.items] as const,
          ),
        ),
      )
        .then(async (stages) => {
          setPipeline(Object.fromEntries(stages));
          setDetails(
            await getVariantDetailsMap(
              stages.flatMap(([, items]) =>
                items.map((i) => i.productVariantId),
              ),
            ),
          );
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);
  useRefetchOnFocus(() => load(true));

  const stats = useMemo(() => {
    const s = sellerStats;
    return {
      revenue: Number(s?.revenue ?? 0),
      ordersToday: s?.ordersToday ?? 0,
      ordersYesterday: s?.ordersYesterday ?? 0,
      active: s?.listings.active ?? 0,
      drafts: s?.listings.draft ?? 0,
      toShip: s?.toDropOff ?? 0,
      daily: s?.daily ?? new Array<number>(SPARK_DAYS).fill(0),
      countOf: (status: OrderStatus) => s?.countsByStatus[status] ?? 0,
      hasOrders: Object.values(s?.countsByStatus ?? {}).some((n) => n > 0),
    };
  }, [sellerStats]);

  // Sales this week vs. the week before (non-cancelled items, from the
  // same 14-day series as the sparkline).
  const weekChange = percentChange(
    stats.daily.slice(7).reduce((a, b) => a + b, 0),
    stats.daily.slice(0, 7).reduce((a, b) => a + b, 0),
  );

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Seller overview"
        title={profile?.storeName ?? "Your store"}
        description="Sales, orders and listings at a glance."
        actions={
          <>
            <ButtonLink href="/seller/products/new">
              <Icon name="plus" />
              New listing
            </ButtonLink>
          </>
        }
      />

      {!loading && !profile && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Icon name="alert" />
            Finish setting up your store to start selling.
          </p>
          <ButtonLink href="/profile/seller" size="sm" variant="secondary">
            Set up store
          </ButtonLink>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <StatSkeletons count={4} />
        ) : (
          <>
            <StatTile
              label="Revenue"
              value={formatKES(stats.revenue)}
              hint="From delivered items"
              icon="wallet"
              trend={<Trend change={weekChange} period="vs. last week" />}
              className="sm:col-span-2 lg:col-span-1"
            >
              <div className="mt-3">
                <Sparkline values={stats.daily} />
                <p className="mt-1 text-2xs uppercase tracking-widest text-zinc-500">
                  Sales, last {SPARK_DAYS} days
                </p>
              </div>
            </StatTile>
            <StatTile
              label="Orders today"
              value={stats.ordersToday}
              trend={
                <Trend
                  change={percentChange(
                    stats.ordersToday,
                    stats.ordersYesterday,
                  )}
                  period="vs. yesterday"
                />
              }
              hint={`${profile?.totalSales ?? 0} completed sales all time`}
              icon="receipt"
              href="/seller/orders"
            />
            <StatTile
              label="Active listings"
              value={stats.active}
              hint={
                stats.drafts > 0
                  ? `${stats.drafts} draft${stats.drafts === 1 ? "" : "s"}`
                  : "All published"
              }
              icon="tag"
              href="/seller/products"
            />
            <StatTile
              label="To drop off"
              value={stats.toShip}
              hint={
                stats.toShip > 0
                  ? `Paid items to take to the hub`
                  : "All caught up"
              }
              icon="truck"
              href="/seller/orders"
            />
          </>
        )}
      </div>

      <Section
        id="pipeline"
        title="Order pipeline"
        action={
          stats.hasOrders ? (
            <ViewAll href="/seller/orders" label="Fulfilment" />
          ) : undefined
        }
      >
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-4">
            {PIPELINE.map((p) => (
              <Skeleton key={p.status} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : !stats.hasOrders ? (
          <EmptyState
            icon="inbox"
            title="No orders yet"
            description="Orders for your listings appear here as they move from pending to shipped."
            titleAs="h3"
          />
        ) : (
          <div className="scrollbar-none -mx-4 grid snap-x auto-cols-[80%] grid-flow-col gap-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:auto-cols-[45%] sm:px-6 lg:mx-0 lg:grid-flow-row lg:grid-cols-4 lg:px-0">
            {PIPELINE.map((stage) => {
              const stageItems = pipeline[stage.status] ?? [];
              const stageCount = stats.countOf(stage.status);
              return (
                <div
                  key={stage.status}
                  className="snap-start rounded-xl border border-zinc-200 bg-zinc-100/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <h3 className="flex items-center gap-2 px-1 pb-3 font-sans text-sm font-medium tracking-normal text-zinc-700 dark:text-zinc-300">
                    <span
                      aria-hidden="true"
                      className={cn("h-2 w-2 rounded-full", stage.dot)}
                    />
                    {stage.label}
                    <span className="tabular ml-auto font-mono text-xs text-zinc-500">
                      {stageCount}
                    </span>
                  </h3>
                  {stageItems.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                      Nothing here
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {stageItems.slice(0, 3).map((item) => {
                        const d = details[item.productVariantId];
                        return (
                          <li key={item.id}>
                            <Link
                              href="/seller/orders"
                              className="block rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                            >
                              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {d?.product.name ?? "Order item"}
                              </p>
                              <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                <span>
                                  Qty{" "}
                                  <span className="tabular font-mono">
                                    {item.quantity}
                                  </span>
                                  {" · "}
                                  <time dateTime={item.createdAt}>
                                    {relativeTime(item.createdAt)}
                                  </time>
                                </span>
                                <Price
                                  amount={item.subtotal}
                                  size="sm"
                                  className="text-xs"
                                />
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                      {stageCount > stageItems.length && (
                        <li>
                          <Link
                            href="/seller/orders"
                            className="block rounded-lg px-3 py-1.5 text-center text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                          >
                            +{stageCount - stageItems.length} more
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section id="quick-actions" title="Quick actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: "Add a listing",
                desc: "Photos, variants and price",
                href: "/seller/products/new",
                icon: "plus",
              },
              {
                label: "Fulfil orders",
                desc: "Confirm, pack and ship",
                href: "/seller/orders",
                icon: "truck",
              },
              {
                label: "Run a promotion",
                desc: "Discount codes for buyers",
                href: "/seller/promotions",
                icon: "zap",
              },
              {
                label: "Store settings",
                desc: "Name, logo and description",
                href: "/profile/seller",
                icon: "store",
              },
            ] as const
          ).map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={cardClasses({
                variant: "hover",
                className: "group flex items-start gap-3 p-4",
              })}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700 dark:text-brand-400">
                <Icon name={a.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {a.label}
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {a.desc}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  return user?.role === "seller" ? (
    <SellerDashboard />
  ) : (
    <BuyerDashboard name={user?.name} />
  );
}
