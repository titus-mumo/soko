"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProductBySlug } from "@/lib/products.api";
import { addToCart } from "@/lib/cart.api";
import { useCartStore } from "@/store/cart.store";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Product, ProductVariant } from "@/lib/types";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const setCart = useCartStore((s) => s.setCart);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProductBySlug(slug)
      .then((p) => {
        setProduct(p);
        setSelectedVariant(p.variants[0] ?? null);
      })
      .catch(() => setError("Product not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return;
    setAdding(true);
    try {
      const items = await addToCart({
        productVariantId: selectedVariant.id,
        quantity,
      });
      setCart(items);
      toast.success("Added to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-zinc-400 dark:text-zinc-600">
          {error ?? "Product not found"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.back()}
        >
          Go back
        </Button>
      </div>
    );
  }

  const variantLabel = (v: ProductVariant) =>
    [v.size, v.color, v.material].filter(Boolean).join(" / ") || v.sku;

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
        Back
      </button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="flex h-96 items-center justify-center rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0].url}
              alt={product.name}
              className="h-full w-full rounded-md object-contain p-4"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-300 dark:text-zinc-700"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                {product.name}
              </h1>
              <Badge
                variant={
                  product.condition === "new"
                    ? "success"
                    : product.condition === "used"
                      ? "warning"
                      : "zinc"
                }
              >
                {product.condition}
              </Badge>
            </div>
            {product.category && (
              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">
                {product.category.name}
              </p>
            )}
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {product.description}
            </p>
          )}

          {/* Variant selector */}
          {product.variants.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Variant
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                      selectedVariant?.id === v.id
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-400"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {variantLabel(v)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedVariant && (
            <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              KES {Number(selectedVariant.price).toLocaleString()}
            </div>
          )}

          {/* Quantity + add to cart */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                −
              </button>
              <span className="w-8 text-center text-sm text-zinc-800 dark:text-zinc-200">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                +
              </button>
            </div>
            <Button
              onClick={handleAddToCart}
              isLoading={adding}
              disabled={!selectedVariant || selectedVariant.stockQuantity === 0}
            >
              {selectedVariant?.stockQuantity === 0
                ? "Out of stock"
                : "Add to cart"}
            </Button>
          </div>

          {selectedVariant &&
            selectedVariant.stockQuantity !== undefined &&
            selectedVariant.stockQuantity > 0 &&
            selectedVariant.stockQuantity <= 5 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Only {selectedVariant.stockQuantity} left in stock
              </p>
            )}

          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
