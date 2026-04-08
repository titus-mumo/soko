"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSellerOrders,
  getSellerOrdersByStatus,
  updateOrderItemStatus,
} from "@/lib/orders.api";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/store/toast.store";
import type { Order, OrderStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

const STATUS_FILTERS = [
  { value: "", label: "All orders" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetch = statusFilter
      ? getSellerOrdersByStatus(statusFilter as OrderStatus)
      : getSellerOrders();
    fetch.then(setOrders).finally(() => setLoading(false));
  }, [statusFilter]);

  const handleAdvanceStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    // seller orders endpoint uses order item ids, not order ids
    // update the first item's status as proxy
    const firstItem = order.items?.[0];
    if (!firstItem) return;
    setUpdatingId(order.id);
    try {
      await updateOrderItemStatus(firstItem.id, next);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)),
      );
      toast.success(`Order marked as ${next}`);
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Seller orders
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your incoming orders
          </p>
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="max-w-[180px]"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">
          No orders{statusFilter ? ` with status "${statusFilter}"` : ""}
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-md border border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {orders.map((order) => {
            const next = NEXT_STATUS[order.status];
            return (
              <div key={order.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-600">
                    {order.items.length} item
                    {order.items.length !== 1 ? "s" : ""} · KES{" "}
                    {Number(order.total).toLocaleString()} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {next && (
                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={updatingId === order.id}
                      onClick={() => handleAdvanceStatus(order)}
                    >
                      Mark as {next}
                    </Button>
                  )}
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
