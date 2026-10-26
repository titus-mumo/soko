"use client";

import { useEffect, useState } from "react";
import { OrdersListSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { getBuyerOrderStats, getBuyerOrders } from "@/lib/orders.api";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  statusLabel,
} from "@/components/ui/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { usePagedList } from "@/hooks/usePagedList";
import { LoadMore } from "@/components/ui/LoadMore";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { cardClasses } from "@/components/ui/Card";
import { orderRef, relativeTime } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const FILTERS: ("all" | OrderStatus)[] = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function OrdersPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  // Total across all statuses (null until known), for the header and to
  // tell "no orders at all" from "none at this status".
  const [total, setTotal] = useState<number | null>(null);

  // Filtered on the server, so a status tab isn't limited to loaded pages.
  const list = usePagedList(
    (page) => getBuyerOrders(page, filter === "all" ? undefined : filter),
    [filter],
    { errorMessage: "Failed to load orders" },
  );
  const { items: visible, loading, error } = list;

  const loadTotal = () =>
    getBuyerOrderStats()
      .then((s) => setTotal(s.total))
      .catch(() => {});
  useEffect(() => {
    loadTotal();
  }, []);
  useRefetchOnFocus(() => {
    list.reload({ quiet: true });
    loadTotal();
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description={
          total
            ? `${total} order${total === 1 ? "" : "s"} placed`
            : "Your order history"
        }
      />

      {(total ?? 0) > 0 && (
        <FilterChips
          label="Filter orders by status"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({
            value: f,
            label: f === "all" ? "All" : statusLabel(f),
          }))}
        />
      )}

      {loading ? (
        <OrdersListSkeleton />
      ) : error ? (
        <ErrorState
          title="Couldn't load your orders"
          message={error}
          onRetry={() => list.reload()}
        />
      ) : visible.length === 0 && filter === "all" ? (
        <EmptyState
          icon="receipt"
          title="No orders yet"
          description="When you place an order it will appear here"
          action={
            <ButtonLink href="/products">
              Start shopping
              <Icon name="arrow-right" />
            </ButtonLink>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title={`No ${statusLabel(filter).toLowerCase()} orders`}
          description="Try a different status filter."
          compact
        />
      ) : (
        <>
          {/* Desktop: table */}
          <div
            className={cardClasses({
              padded: false,
              className: "hidden overflow-hidden md:block",
            })}
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Order
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Placed
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Payment
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="w-10 px-3 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {visible.map((order) => (
                  <tr
                    key={order.id}
                    className="group relative transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-5 py-4">
                      {/* Stretched link makes the whole row clickable. */}
                      <Link
                        href={`/orders/${order.id}`}
                        className="rounded font-mono font-medium text-zinc-500 after:absolute after:inset-0 dark:text-zinc-400"
                      >
                        {orderRef(order.id)}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                      <time
                        dateTime={order.createdAt}
                        title={new Date(order.createdAt).toLocaleString(
                          "en-KE",
                        )}
                      >
                        {relativeTime(order.createdAt)}
                      </time>
                    </td>
                    <td className="px-5 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-4">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Price amount={order.totalAmount} size="sm" />
                    </td>
                    <td className="px-3 py-4 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-600">
                      <Icon name="chevron-right" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {visible.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className={cardClasses({
                    variant: "hover",
                    className: "block p-4",
                  })}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {orderRef(order.id)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <time dateTime={order.createdAt} className="block">
                        {relativeTime(order.createdAt)}
                      </time>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                    <Price amount={order.totalAmount} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <LoadMore
            hasMore={list.hasMore}
            loading={list.loadingMore}
            onLoadMore={list.loadMore}
          />
        </>
      )}
    </div>
  );
}
