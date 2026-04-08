"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCategories, getProductsByCategory } from "@/lib/categories.api";
import { ProductCard } from "@/components/products/ProductCard";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton";
import type { Category, Product } from "@/lib/types";

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .finally(() => setLoadingCats(false));
  }, []);

  const handleSelectCategory = async (cat: Category) => {
    setSelected(cat);
    setLoadingProducts(true);
    try {
      const prods = await getProductsByCategory(cat.id);
      setProducts(prods);
    } finally {
      setLoadingProducts(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Products
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {selected
            ? `Browsing ${selected.name}`
            : "Select a category to browse"}
        </p>
      </div>

      {/* Category tabs */}
      {loadingCats ? (
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat)}
              className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                selected?.id === cat.id
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-400"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Products grid */}
      {!selected && !loadingCats && (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-400 dark:text-zinc-600">
            Pick a category above to see products
          </p>
        </div>
      )}

      {loadingProducts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : selected && products.length === 0 && !loadingProducts ? (
        <p className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-600">
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
