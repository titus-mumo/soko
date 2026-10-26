"use client";

import { useState } from "react";
import { browseProducts } from "@/lib/products.api";
import { LoadMore } from "@/components/ui/LoadMore";
import { apiErrorMessage } from "@/lib/utils";
import { toast } from "@/store/toast.store";
import { ProductCard, ProductGrid, fromCatalogue } from "./ProductCard";
import type { CatalogueItem } from "@/lib/types";

/**
 * A server-rendered first page of products, continued in the browser: the
 * first page arrives with the HTML (good for SEO and first paint); later
 * pages load on demand.
 */
export function MoreProducts({
  initial,
  initialCursor,
  total,
  category,
  pageSize = 24,
}: {
  initial: CatalogueItem[];
  initialCursor: string | null;
  total?: number;
  category?: string;
  pageSize?: number;
}) {
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await browseProducts(
        { category },
        { limit: pageSize, cursor },
      );
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't load more products"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ProductGrid>
        {items.map((p, i) => (
          <ProductCard key={p.id} {...fromCatalogue(p)} priority={i < 4} />
        ))}
      </ProductGrid>
      <LoadMore
        hasMore={cursor !== null}
        loading={loading}
        onLoadMore={loadMore}
        label={`Show ${pageSize} more`}
        shown={items.length}
        total={total}
      />
    </>
  );
}
