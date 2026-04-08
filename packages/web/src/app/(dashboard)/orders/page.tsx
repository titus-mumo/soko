"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrders } from "@/lib/orders.api";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Orders
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your order history
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-zinc-400 dark:text-zinc-600">
            No orders yet
          </p>
          <Link href="/categories" className="mt-4">
            <Button variant="secondary" size="sm">
              Start shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-md border border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Order #{order.id.slice(-6).toUpperCase()}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-600">
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""}{" "}
                  ·{" "}
                  {new Date(order.createdAt).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  KES {Number(order.total).toLocaleString()}
                </span>
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-zinc-300 dark:text-zinc-700"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
