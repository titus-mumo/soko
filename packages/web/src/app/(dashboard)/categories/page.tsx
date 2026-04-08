"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories } from "@/lib/categories.api";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Categories
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Browse by category
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">
          No categories yet
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group flex items-center justify-between rounded-md border border-zinc-100 bg-white px-5 py-4 transition-colors hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div>
                <p className="font-medium text-zinc-800 group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-zinc-50">
                  {cat.name}
                </p>
                {cat.productCount !== undefined && (
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-600">
                    {cat.productCount} product
                    {cat.productCount !== 1 ? "s" : ""}
                  </p>
                )}
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
                className="text-zinc-300 group-hover:text-zinc-400 dark:text-zinc-700 dark:group-hover:text-zinc-500"
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
