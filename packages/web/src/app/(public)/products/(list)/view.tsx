"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getRootCategories } from "@/lib/categories.api";
import { browseProducts } from "@/lib/products.api";
import { usePagedList } from "@/hooks/usePagedList";
import {
  ProductCard,
  ProductGrid,
  fromCatalogue,
} from "@/components/product/ProductCard";
import {
  CategoryPillSkeleton,
  ProductGridSkeleton,
} from "@/components/skeletons";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import { LoadMore } from "@/components/ui/LoadMore";
import type { CatalogueSort, Category } from "@/lib/types";

const ALL = "all";
const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

export default function ProductsPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense>
      <ProductsBrowser />
    </Suspense>
  );
}

/**
 * The catalogue, filtered, searched and sorted on the server and loaded a
 * page at a time.
 */
function ProductsBrowser() {
  const searchParams = useSearchParams();
  const [roots, setRoots] = useState<Category[] | null>(null);
  const [category, setCategory] = useState<string>(
    searchParams.get("category") ?? ALL,
  );
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [search, setSearch] = useState(query.trim());
  const [sort, setSort] = useState<CatalogueSort>("newest");

  // A new search from the navbar changes ?q= without remounting this page.
  const urlQuery = searchParams.get("q") ?? "";
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  // Search as the user types, without a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    getRootCategories()
      .then(setRoots)
      .catch(() => setRoots([]));
  }, []);

  const list = usePagedList(
    (page) =>
      browseProducts(
        { category: category === ALL ? undefined : category, q: search, sort },
        page,
      ),
    [category, search, sort],
    { pageSize: PAGE_SIZE, errorMessage: "Failed to load products" },
  );

  const categoryName =
    category === ALL
      ? "all categories"
      : (roots?.find((c) => c.slug === category)?.name ?? "this category");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={
          <span aria-live="polite">
            {list.loading
              ? "Loading…"
              : `${list.total ?? list.items.length} result${(list.total ?? list.items.length) !== 1 ? "s" : ""} in ${categoryName}`}
          </span>
        }
        actions={
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query.trim());
            }}
            className="w-full sm:w-80"
          >
            <Input
              id="product-search"
              type="search"
              label="Search products"
              hideLabel
              inputSize="lg"
              prefix={<Icon name="search" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products and categories"
            />
          </form>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {roots === null ? (
          <CategoryPillSkeleton />
        ) : (
          <FilterChips
            label="Filter by category"
            value={category}
            onChange={setCategory}
            options={[
              { value: ALL, label: "All" },
              ...roots.map((c) => ({ value: c.slug, label: c.name })),
            ]}
          />
        )}
        <div className="w-44">
          <Select
            id="product-sort"
            label="Sort by"
            hideLabel
            value={sort}
            onChange={(e) => setSort(e.target.value as CatalogueSort)}
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </Select>
        </div>
      </div>

      {list.loading ? (
        <ProductGridSkeleton count={8} />
      ) : list.error && list.items.length === 0 ? (
        <ErrorState
          title="Couldn't load products"
          message={list.error}
          onRetry={() => list.reload()}
        />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={search ? "search" : "package"}
          title={
            search
              ? `No products match "${search}"`
              : `No products in ${categoryName} yet`
          }
          description={
            search
              ? "Check the spelling or try a broader search."
              : "Try another category."
          }
          action={
            search ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            ) : category !== ALL ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCategory(ALL)}
              >
                Show all categories
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section aria-labelledby="product-results">
          <h2 id="product-results" className="sr-only">
            Results
          </h2>
          <ProductGrid>
            {list.items.map((p, i) => (
              <ProductCard key={p.id} {...fromCatalogue(p)} priority={i < 4} />
            ))}
          </ProductGrid>
          <LoadMore
            hasMore={list.hasMore}
            loading={list.loadingMore}
            onLoadMore={list.loadMore}
            label={`Show ${PAGE_SIZE} more`}
            shown={list.items.length}
            total={list.total}
          />
        </section>
      )}
    </div>
  );
}
