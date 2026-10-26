"use client";

import { useState } from "react";
import { getOrdersByStatus, adminUpdateOrderStatus } from "@/lib/admin.api";
import { toast } from "@/store/toast.store";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePagedList } from "@/hooks/usePagedList";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  statusLabel,
} from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiErrorMessage, formatKES } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

const TABS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const satisfies readonly OrderStatus[];

type Tab = (typeof TABS)[number];

// Manual overrides are for exceptions only. Normal progress (preparing →
// shipped → delivered) follows the items and shipment on the Hub page.
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  confirmed: ["cancelled"],
  processing: ["cancelled"],
  dropped_off: [],
  at_hub: [],
  shipped: [],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

function UpdateStatusCell({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const options = NEXT_STATUSES[order.status];

  if (options.length === 0) {
    return <span className="text-xs text-zinc-500 dark:text-zinc-400">—</span>;
  }

  const handle = async (newStatus: OrderStatus) => {
    setSaving(true);
    try {
      await adminUpdateOrderStatus(order.id, newStatus);
      toast.success(
        `Order #${order.id.slice(-8).toUpperCase()} is now ${statusLabel(newStatus)}`,
      );
      onUpdated();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update order"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`status-${order.id}`} className="sr-only">
        Move order #{order.id.slice(-8).toUpperCase()} to
      </label>
      <select
        id={`status-${order.id}`}
        disabled={saving}
        value=""
        onChange={(e) => {
          if (e.target.value) handle(e.target.value as OrderStatus);
        }}
        className="h-7 rounded border border-zinc-200 bg-white px-2 text-xs text-zinc-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <option value="" disabled>
          Move to…
        </option>
        {options.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
      {saving && (
        <span
          role="status"
          aria-label="Saving"
          className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent"
        />
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const list = usePagedList((page) => getOrdersByStatus(tab, page), [tab], {
    errorMessage: "Couldn't load orders",
  });
  const { items: orders, loading, error } = list;
  const load = () => list.reload({ quiet: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Browse and update orders by status"
      />

      <FilterChips
        label="Filter orders by status"
        value={tab}
        onChange={setTab}
        options={TABS.map((s) => ({ value: s, label: statusLabel(s) }))}
      />

      {error ? (
        <ErrorState
          title="Couldn't load orders"
          message={error}
          onRetry={load}
        />
      ) : !loading && orders.length === 0 ? (
        <EmptyState
          icon="bag"
          title={`No ${statusLabel(tab).toLowerCase()} orders`}
          description="Orders in this status will show up here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                {["Order", "Total", "Payment", "Date", "Status", "Update"].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} aria-hidden="true">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-20 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : orders.map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        <span className="tabular font-mono">
                          {formatKES(order.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(order.createdAt).toLocaleDateString("en-KE")}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <UpdateStatusCell order={order} onUpdated={load} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      <LoadMore
        hasMore={list.hasMore}
        loading={list.loadingMore}
        onLoadMore={list.loadMore}
      />
    </div>
  );
}
