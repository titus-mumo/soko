"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardStatSkeleton } from "@/components/skeletons";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { getCartSummary } from "@/lib/cart.api";
import { getBuyerOrderStats, getBuyerOrders } from "@/lib/orders.api";
import { getUserAddresses } from "@/lib/profile.api";
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
import { apiErrorMessage, cn, orderRef, relativeTime } from "@/lib/utils";
import type { Order } from "@/lib/types";

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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  return <BuyerDashboard name={user?.name} />;
}
