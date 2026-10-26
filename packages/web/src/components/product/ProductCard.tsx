import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { AddToCartButton } from "./AddToCartButton";
import type { CatalogueItem, ProductCondition } from "@/lib/types";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  /** Lowest variant price, decimal string. */
  price: string;
  compareAtPrice?: string | null;
  condition: ProductCondition;
  /** The listing's store id — used to stop sellers buying their own items. */
  primaryImage?: string;
  /**
   * The variant "Add to cart" adds. Leave unset when the buyer has to pick
   * an option — the button then opens the product page instead.
   */
  variantId?: string;
  /** Several variants: price shows as "From …". */
  hasOptions?: boolean;
  soldOut?: boolean;
  /** Load the image eagerly — for cards in the first viewport. */
  priority?: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString("en-KE", { maximumFractionDigits: 2 });

const CONDITION: Record<ProductCondition, string> = {
  new: "bg-green-900/80 text-green-400",
  used: "bg-zinc-800/80 text-zinc-400",
  refurbished: "bg-blue-900/80 text-blue-400",
};

/** Card props from a catalogue row (the paged /products listing). */
export function fromCatalogue(p: CatalogueItem): ProductCardProps {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    condition: p.condition,
    primaryImage: p.image ?? undefined,
    variantId: p.variantId ?? undefined,
    hasOptions: p.hasOptions,
    soldOut: p.soldOut,
  };
}

export function ProductCard({
  name,
  slug,
  price,
  compareAtPrice,
  condition,
  primaryImage,
  variantId,
  hasOptions = false,
  soldOut = false,
  priority = false,
}: ProductCardProps) {
  const href = `/products/${slug}`;
  const now = Number(price);
  const was = compareAtPrice ? Number(compareAtPrice) : 0;

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {primaryImage ? (
          <SafeImage
            src={primaryImage}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
            <Icon name="package" size={32} strokeWidth={1.25} />
          </div>
        )}

        <span
          className={cn(
            "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
            CONDITION[condition],
          )}
        >
          {condition}
        </span>
        {soldOut && (
          <span className="absolute right-2 top-2 rounded-md bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            Sold out
          </span>
        )}

        {!soldOut && (
          <AddToCartButton
            productName={name}
            productHref={href}
            variantId={variantId}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-0.5 pt-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-100">
          {/* Stretched link: the whole card opens the product, while the
              add-to-cart button above stays its own target. */}
          <Link
            href={href}
            className="rounded after:absolute after:inset-0 after:rounded-lg"
          >
            {name}
          </Link>
        </h3>
        <p className="mt-auto flex items-baseline justify-between gap-2 pt-1">
          <span className="flex items-baseline gap-1.5">
            {hasOptions && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                From
              </span>
            )}
            <span className="tabular font-mono text-base font-semibold text-brand-600 dark:text-brand-500">
              <span className="mr-1 text-[0.7em] font-medium opacity-80">
                KES
              </span>
              {fmt(now)}
            </span>
          </span>
          {was > now && (
            <span className="tabular font-mono text-sm text-zinc-500 line-through">
              <span className="sr-only">was </span>
              {fmt(was)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

/** Grid shared by every product listing: 2 / 3 / 4 columns. */
export function ProductGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}
