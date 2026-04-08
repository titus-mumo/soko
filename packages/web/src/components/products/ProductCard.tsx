import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const minPrice = product.variants.length
    ? Math.min(...product.variants.map((v) => Number(v.price)))
    : null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-md border border-zinc-100 bg-white transition-colors hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      {/* Image placeholder */}
      <div className="flex h-44 items-center justify-center rounded-t-md bg-zinc-50 dark:bg-zinc-800">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0].url}
            alt={product.name}
            className="h-full w-full rounded-t-md object-cover"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-300 dark:text-zinc-600"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <p className="truncate text-sm font-medium text-zinc-800 group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-zinc-50">
            {product.name}
          </p>
          {product.category && (
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-600">
              {product.category.name}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between">
          {minPrice !== null && (
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              KES {minPrice.toLocaleString()}
            </span>
          )}
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
      </div>
    </Link>
  );
}
