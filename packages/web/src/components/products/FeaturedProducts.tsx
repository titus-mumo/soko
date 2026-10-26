"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { browseProducts } from "@/lib/products.api";
import {
  ProductCard,
  ProductGrid,
  fromCatalogue,
} from "@/components/product/ProductCard";
import { ProductGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CatalogueItem } from "@/lib/types";

/** The newest live products, card-ready, in one request. */
async function loadFeatured(limit: number): Promise<CatalogueItem[]> {
  return (await browseProducts({}, { limit })).items;
}

export function FeaturedProductsSkeleton({ count = 8 }: { count?: number }) {
  return <ProductGridSkeleton count={count} />;
}

export default function FeaturedProducts({ limit = 8 }: { limit?: number }) {
  const [products, setProducts] = useState<CatalogueItem[] | null>(null);

  useEffect(() => {
    loadFeatured(limit)
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [limit]);

  if (products === null) return <FeaturedProductsSkeleton />;

  if (products.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="No products listed yet"
        description="New listings will show up here."
        titleAs="h3"
        compact
        action={
          <ButtonLink href="/categories" variant="secondary" size="sm">
            Browse categories
          </ButtonLink>
        }
      />
    );
  }

  return (
    <ProductGrid>
      {products.map((p) => (
        <ProductCard key={p.id} {...fromCatalogue(p)} />
      ))}
    </ProductGrid>
  );
}
