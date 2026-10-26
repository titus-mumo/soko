"use client";

import { useEffect, useState } from "react";
import {
  getSellerOrderItems,
  getSellerOrderItemsByStatus,
  getSellerStats,
  updateOrderItemStatus,
} from "@/lib/orders.api";
import { getVariantDetailsMap } from "@/lib/products.api";
import { ItemStatusBadge, itemStatusLabel } from "@/components/ui/StatusBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { SafeImage } from "@/components/ui/SafeImage";
import { Icon } from "@/components/ui/Icon";
import { cardClasses } from "@/components/ui/Card";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { usePagedList } from "@/hooks/usePagedList";
import { LoadMore } from "@/components/ui/LoadMore";
import { toast } from "@/store/toast.store";
import { DROP_OFF_HOURS, HUB_LABEL } from "@/lib/hub";
import {
  apiErrorMessage,
  formatKES,
  orderRef,
  relativeTime,
} from "@/lib/utils";
import type {
  SellerOrderItem,
  OrderStatus,
  SellerItemStatus,
  VariantDetails,
} from "@/lib/types";

// The seller's part: pack, then hand in at the hub. Soko ships from there.
const TABS: OrderStatus[] = [
  "confirmed",
  "processing",
  "dropped_off",
  "at_hub",
  "shipped",
  "delivered",
  "pending",
  "cancelled",
];

const CANCELLABLE: OrderStatus[] = ["pending", "confirmed", "processing"];

type Filter = "all" | OrderStatus;

export default function SellerOrdersPage() {
  const [variants, setVariants] = useState<Record<string, VariantDetails>>({});
  const [filter, setFilter] = useState<Filter>("confirmed");
  // Items per status, counted by the API (the list itself is paged).
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>(
    {},
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<SellerOrderItem | null>(
    null,
  );

  // Each tab is filtered on the server.
  const list = usePagedList(
    (page) =>
      filter === "all"
        ? getSellerOrderItems(page)
        : getSellerOrderItemsByStatus(filter, page),
    [filter],
    { errorMessage: "Failed to load orders" },
  );
  const { items: visible, setItems, loading, error } = list;

  // Product names and photos for whatever has loaded so far.
  useEffect(() => {
    const missing = visible
      .map((i) => i.productVariantId)
      .filter((id) => !(id in variants));
    if (missing.length === 0) return;
    getVariantDetailsMap(missing)
      .then((found) => setVariants((prev) => ({ ...prev, ...found })))
      .catch(() => {});
  }, [visible, variants]);

  const loadCounts = () =>
    getSellerStats()
      .then((s) => setCounts(s.countsByStatus))
      .catch(() => {});
  useEffect(() => {
    loadCounts();
  }, []);

  const load = () => {
    list.reload({ quiet: true });
    loadCounts();
  };
  // The hub receiving items changes their status; pick that up.
  useRefetchOnFocus(load);

  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  const move = async (item: SellerOrderItem, to: SellerItemStatus) => {
    setUpdatingId(item.id);
    try {
      await updateOrderItemStatus(item.id, to);
      // It moves to another tab (unless viewing all).
      setItems((prev) =>
        filter === "all"
          ? prev.map((i) => (i.id === item.id ? { ...i, status: to } : i))
          : prev.filter((i) => i.id !== item.id),
      );
      setCounts((c) => ({
        ...c,
        [item.status]: Math.max(0, (c[item.status] ?? 0) - 1),
        [to]: (c[to] ?? 0) + 1,
      }));
      toast.success(
        to === "dropped_off"
          ? "Marked as dropped off. The hub will confirm when it's received."
          : to === "cancelled"
            ? "Item cancelled. The buyer has been told."
            : "Marked as packing",
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update"));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async () => {
    if (!confirmCancel) return;
    await move(confirmCancel, "cancelled");
    setConfirmCancel(null);
  };

  const toPrepare = (counts.confirmed ?? 0) + (counts.processing ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Pack each paid item and drop it off at the hub. Soko ships it to the buyer."
      />

      <div className="flex items-start gap-3 rounded-xl border border-brand-600/30 bg-brand-600/[0.06] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700 dark:text-brand-400">
          <Icon name="pin" size={18} />
        </span>
        <div className="text-sm">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            Drop off at {HUB_LABEL}
          </p>
          <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
            Within {DROP_OFF_HOURS} hours of payment. Label each item with its
            order number.
            {toPrepare > 0 && (
              <>
                {" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {toPrepare} item{toPrepare === 1 ? "" : "s"} to drop off.
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <FilterChips
        label="Filter order items by status"
        value={filter}
        onChange={setFilter}
        options={[...TABS, "all" as const].map((t) => ({
          value: t,
          label: t === "all" ? "All" : itemStatusLabel(t),
          count: t === "all" ? total : (counts[t] ?? 0),
        }))}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load orders"
          message={error}
          onRetry={() => list.reload()}
        />
      ) : total === 0 && visible.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="No orders yet"
          description="Orders for your products will appear here."
          action={
            <ButtonLink href="/seller/products" variant="secondary">
              Check your listings
            </ButtonLink>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={
            filter === "confirmed"
              ? "Nothing to prepare"
              : `Nothing in ${filter === "all" ? "this view" : itemStatusLabel(filter).toLowerCase()}`
          }
          description={
            filter === "confirmed"
              ? "New paid orders will show up here."
              : undefined
          }
          compact
        />
      ) : (
        <ul
          className={cardClasses({
            padded: false,
            className: "divide-y divide-zinc-100 dark:divide-zinc-800",
          })}
        >
          {visible.map((item) => {
            const v = variants[item.productVariantId];
            const label = v
              ? [v.variant.size, v.variant.color].filter(Boolean).join(" / ") ||
                "Standard"
              : null;
            const busy = updatingId === item.id;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {v?.primaryImage && (
                      <SafeImage
                        src={v.primaryImage.url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {v?.product.name ?? "Unknown product"}
                      </p>
                      <ItemStatusBadge status={item.status} size="sm" />
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono">
                        {orderRef(item.orderId)}
                      </span>
                      {label && ` · ${label}`} · Qty{" "}
                      <span className="tabular font-mono">{item.quantity}</span>{" "}
                      ·{" "}
                      <span className="tabular font-mono">
                        {formatKES(item.subtotal)}
                      </span>{" "}
                      · {relativeTime(item.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {CANCELLABLE.includes(item.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                      disabled={busy}
                      onClick={() => setConfirmCancel(item)}
                    >
                      Cancel
                    </Button>
                  )}
                  {item.status === "confirmed" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => move(item, "processing")}
                    >
                      Start packing
                    </Button>
                  )}
                  {(item.status === "confirmed" ||
                    item.status === "processing") && (
                    <Button
                      size="sm"
                      isLoading={busy}
                      onClick={() => move(item, "dropped_off")}
                    >
                      <Icon name="check" size={14} />
                      Mark dropped off
                    </Button>
                  )}
                  {item.status === "dropped_off" && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Waiting for the hub to confirm
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <LoadMore
        hasMore={list.hasMore}
        loading={list.loadingMore}
        onLoadMore={list.loadMore}
      />

      <ConfirmDialog
        open={confirmCancel !== null}
        title="Cancel item"
        message="Cancel this item? The buyer will be told it's no longer available, and the rest of their order still ships."
        confirmLabel="Cancel item"
        cancelLabel="Keep"
        destructive
        loading={updatingId === confirmCancel?.id}
        onConfirm={handleCancel}
        onClose={() => setConfirmCancel(null)}
      />
    </div>
  );
}
