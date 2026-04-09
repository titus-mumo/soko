"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { getCart } from "@/lib/cart.api";
import { getOrders } from "@/lib/orders.api";
import { getSellerProfile } from "@/lib/seller.api";
import { getCategories } from "@/lib/categories.api";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import type { Order, Category, SellerProfile } from "@/lib/types";

// ─── Buyer view ───────────────────────────────────────────────────────────────

function BuyerDashboard() {
  const { items, subtotal, setCart } = useCartStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCart().then(setCart),
      getOrders().then((r) => setOrders(r.slice(0, 5))),
      getCategories().then(setCategories),
    ]).finally(() => setLoading(false));
  }, [setCart]);

  if (loading) {
    return (
      <div className="grid gap-4 p-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Cart summary */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          Cart
        </h2>
        <div className="flex items-center justify-between rounded-md border border-zinc-100 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
            <p className="mt-0.5 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              KES {subtotal.toLocaleString()}
            </p>
          </div>
          <Link href="/cart">
            <Button variant="secondary" size="sm">
              View cart
            </Button>
          </Link>
        </div>
      </section>

      {/* Recent orders */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            Recent orders
          </h2>
          <Link
            href="/orders"
            className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            View all
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-600">
            No orders yet
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-md border border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Order #{order.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    KES {Number(order.total).toLocaleString()}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Browse categories */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            Browse by category
          </h2>
          <Link
            href="/categories"
            className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            All categories
          </Link>
        </div>
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-600">
            No categories yet
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group flex items-center justify-between rounded-md border border-zinc-100 bg-white px-4 py-3 transition-colors hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-zinc-50">
                  {cat.name}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
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
      </section>
    </div>
  );
}

// ─── Seller view ──────────────────────────────────────────────────────────────

function SellerDashboard() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSellerProfile()
        .then(setProfile)
        .catch(() => {}),
      getOrders()
        .then(setOrders)
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {profile ? profile.storeName : "Seller overview"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your store at a glance
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total orders", value: orders.length },
            { label: "Pending", value: pendingCount },
            { label: "Confirmed", value: confirmedCount },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-md border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/seller/products/new">
          <Button>New listing</Button>
        </Link>
        <Link href="/seller/orders">
          <Button variant="secondary">View orders</Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isSeller = user?.role === "seller";
  return isSeller ? <SellerDashboard /> : <BuyerDashboard />;
}
