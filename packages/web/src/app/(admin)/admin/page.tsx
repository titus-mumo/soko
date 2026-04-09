"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAllUsers,
  getOrdersByStatus,
  getAllCategories,
  getDeliveryZones,
  getDisputesByStatus,
  getPlatformPromotions,
} from "@/lib/admin.api";
import { Skeleton } from "@/components/ui/Skeleton";

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
      className="group flex flex-col gap-1 rounded-md border border-zinc-100 bg-white p-5 transition-colors hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>}
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-md border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <Skeleton className="mb-2 h-3 w-20 rounded" />
      <Skeleton className="h-7 w-12 rounded" />
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    pendingOrders: number;
    totalCategories: number;
    deliveryZones: number;
    openDisputes: number;
    activePromotions: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      getAllUsers().catch(() => []),
      getOrdersByStatus("pending").catch(() => []),
      getAllCategories().catch(() => []),
      getDeliveryZones().catch(() => []),
      getDisputesByStatus("open").catch(() => []),
      getPlatformPromotions().catch(() => []),
    ]).then(
      ([users, pendingOrders, categories, zones, disputes, promotions]) => {
        setStats({
          totalUsers: users.length,
          pendingOrders: pendingOrders.length,
          totalCategories: categories.length,
          deliveryZones: zones.length,
          openDisputes: disputes.length,
          activePromotions: (promotions as any[]).filter(
            (p) =>
              p.isActive !== false &&
              (!p.expiresAt || new Date(p.expiresAt) > new Date()),
          ).length,
        });
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
          sub: stats.openDisputes > 0 ? "Needs attention" : "All clear",
        },
        {
          label: "Active promotions",
          value: stats.activePromotions,
          href: "/admin/promotions",
        },
      ]
    : [];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Platform at a glance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats === null
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : cards.map((c) => <Card key={c.label} {...c} />)}
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
              className="flex items-center justify-between rounded-md border border-zinc-100 bg-white px-4 py-3 text-sm text-zinc-700 transition-colors hover:border-zinc-200 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
            >
              {l.label}
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
      </section>
    </div>
  );
}
