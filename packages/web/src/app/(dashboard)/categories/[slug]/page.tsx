"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCategoryBySlug, getProductsByCategory } from "@/lib/categories.api";
import { ProductCard } from "@/components/products/ProductCard";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { Category, Product } from "@/lib/types";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategoryBySlug(slug)
      .then((cat) => {
        setCategory(cat);
        return getProductsByCategory(cat.id);
      })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="space-y-6 p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
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
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Categories
      </button>

      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {category?.name ?? slug}
        </h1>
        {!loading && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">
          No products in this category yet
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
