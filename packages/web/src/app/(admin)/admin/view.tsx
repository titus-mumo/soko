"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";
import {
  getAllUsers,
  getOrdersByStatus,
  getAllCategories,
  getDeliveryZones,
  getDisputesByStatus,
  getPlatformPromotions,
} from "@/lib/admin.api";
import type { Paged } from "@/lib/paging";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";

interface StatCard {
  label: string;
  value: number | string;
  href: string;
  sub?: string;
}

function Card({ label, value, href, sub }: StatCard) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight dark:hover:border-zinc-700"
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight">
      <Skeleton className="mb-2 h-3 w-20 rounded" />
      <Skeleton className="h-7 w-12 rounded" />
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<{
    totalUsers: string;
    pendingOrders: string;
    totalCategories: number;
    deliveryZones: number;
    openDisputes: string;
    activePromotions: string;
  } | null>(null);

  const [failed, setFailed] = useState(0);

  useEffect(() => {
    // One failing endpoint shouldn't blank the whole overview — count
    // failures and say so instead of silently showing zeros.
    let failures = 0;
    const safe = <T,>(p: Promise<T[]>) =>
      p.catch(() => {
        failures++;
        return [] as T[];
      });
    // Lists are paged: one page of 100 is enough to count, shown as "100+"
    // when there's more.
    const first = { limit: 100 };
    const safePage = <T,>(p: Promise<Paged<T>>) =>
      p.catch(() => {
        failures++;
        return { items: [], nextCursor: null } as Paged<T>;
      });
    const count = (n: number, page: Paged<unknown>) =>
      `${n}${page.nextCursor ? "+" : ""}`;
    Promise.all([
      safePage(getAllUsers(first)),
      safePage(getOrdersByStatus("pending", first)),
      safe(getAllCategories()),
      safe(getDeliveryZones()),
      safePage(getDisputesByStatus("open", first)),
      safePage(getPlatformPromotions(first)),
    ]).then(
      ([users, pendingOrders, categories, zones, disputes, promotions]) => {
        setStats({
          totalUsers: count(users.items.length, users),
          pendingOrders: count(pendingOrders.items.length, pendingOrders),
          totalCategories: categories.length,
          deliveryZones: zones.length,
          openDisputes: count(disputes.items.length, disputes),
          activePromotions: count(
            promotions.items.filter(
              (p) =>
                p.isActive !== false &&
                (!p.expiresAt || new Date(p.expiresAt) > new Date()),
            ).length,
            promotions,
          ),
        });
        setFailed(failures);
      },
    );
  }, []);

  const cards: StatCard[] = stats
    ? [
        {
          label: "Total users",
          value: stats.totalUsers,
          href: "/admin/users",
        },
        {
          label: "Pending orders",
          value: stats.pendingOrders,
          href: "/admin/orders",
          sub: "Awaiting confirmation",
        },
        {
          label: "Categories",
          value: stats.totalCategories,
          href: "/admin/categories",
        },
        {
          label: "Delivery zones",
          value: stats.deliveryZones,
          href: "/admin/delivery",
        },
        {
          label: "Open disputes",
          value: stats.openDisputes,
          href: "/admin/disputes",
          sub: stats.openDisputes !== "0" ? "Needs attention" : "All clear",
        },
        {
          label: "Active promotions",
          value: stats.activePromotions,
          href: "/admin/promotions",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" description="Platform at a glance" />

      {failed > 0 && (
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400"
        >
          {failed} of 6 stats couldn&apos;t load and show as 0. Refresh to try
          again.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {stats === null
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : cards.map((c) => <Card key={c.label} {...c} />)}
      </div>

      <section>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Quick links
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/users", label: "Manage users" },
            { href: "/admin/orders", label: "Review orders" },
            { href: "/admin/categories", label: "Edit categories" },
            { href: "/admin/delivery", label: "Delivery zones" },
            { href: "/admin/disputes", label: "Handle disputes" },
            { href: "/admin/promotions", label: "Create promotions" },
            { href: "/admin/notifications", label: "Send notifications" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
            >
              {l.label}
              <Icon
                name="chevron-right"
                size={13}
                className="shrink-0 text-zinc-300 dark:text-zinc-700"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
