"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { addToAnyCart } from "@/lib/guest-cart";
import { LOW_STOCK, availableOf } from "@/lib/stock";
import { useInCart } from "@/store/cart.store";
import { useSessionUser } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { Tabs } from "@/components/ui/Tabs";
import { SafeImage } from "@/components/ui/SafeImage";
import { Stars } from "@/components/ui/Stars";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductReviewsSkeleton } from "@/components/products/ProductReviews";
import { getAllDeliveryZones } from "@/lib/delivery.api";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { apiErrorMessage, cn, formatKES } from "@/lib/utils";
import type { ProductPageData } from "@/lib/server-api";
import type { DeliveryZone, ProductVariant } from "@/lib/types";

// Reviews sit below the fold — load their code and data after the page.
const ProductReviews = dynamic(
  () => import("@/components/products/ProductReviews"),
  { ssr: false, loading: () => <ProductReviewsSkeleton /> },
);

const variantLabel = (v: ProductVariant) =>
  [v.size, v.color, v.material].filter(Boolean).join(" / ") || "Standard";

export default function ProductDetailView({ data }: { data: ProductPageData }) {
  const { product, variants, images, tags, category, seller, rating } = data;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.find((v) => availableOf(v) > 0) ?? variants[0] ?? null,
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const cheapest = variants.length
      ? Math.min(...variants.map((v) => Number(v.price)))
      : null;
    recordRecentlyViewed({
      slug: product.slug,
      name: product.name,
      image: images[0]?.url ?? null,
      price: cheapest,
    });
  }, [product.slug, product.name, images, variants]);

  const selectVariant = (v: ProductVariant) => {
    setSelectedVariant(v);
    setQuantity(1); // keep quantity within the new variant's stock
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setAdding(true);
    try {
      // Signed in: the account's cart. Signed out: this browser's cart,
      // which moves to the account on sign-in. Never redirects.
      await addToAnyCart(selectedVariant.id, quantity);
      toast.success(
        `Added ${quantity > 1 ? `${quantity} × ` : ""}${product.name} to cart`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to add to cart"));
    } finally {
      setAdding(false);
    }
  };

  // What's left once other shoppers' carts are counted.
  const left = selectedVariant ? availableOf(selectedVariant) : 0;
  const outOfStock = left === 0;
  // A product without options is a single cart line: once added, the page
  // points to the cart instead of offering to add it again.
  const inCart = useInCart(variants.length === 1 ? selectedVariant?.id : null);
  // Admins run the catalogue: they get a way into the listing, not a cart.
  const isAdmin = useSessionUser()?.role === "admin";
  const price = Number(selectedVariant?.price ?? 0);
  const was = Number(selectedVariant?.compareAtPrice ?? 0);
  const saving = was > price ? was - price : 0;
  const lowStock = selectedVariant && left > 0 && left <= LOW_STOCK;

  return (
    <div className="space-y-12">
      <Breadcrumbs
        items={[
          ["Products", "/products"],
          ...(category
            ? [
                [category.name, `/categories/${category.slug}`] as [
                  string,
                  string,
                ],
              ]
            : []),
          [product.name, `/products/${product.slug}`],
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        {/* Gallery */}
        <section aria-label="Product photos" className="space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-zinc-900/5 dark:ring-white/10">
            {images.length > 0 ? (
              // Every photo is stacked; the selected one fades in.
              images.map((img, i) => (
                <SafeImage
                  key={img.id}
                  src={img.url}
                  alt={
                    images.length > 1
                      ? `${product.name}, photo ${i + 1} of ${images.length}`
                      : product.name
                  }
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 640px, 100vw"
                  aria-hidden={i !== selectedImage}
                  className={cn(
                    "object-contain p-[6%] transition-opacity duration-300 ease-out",
                    i === selectedImage ? "opacity-100" : "opacity-0",
                  )}
                />
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-300 dark:text-zinc-700">
                <Icon name="image" size={48} strokeWidth={1} />
                <span className="text-sm text-zinc-400 dark:text-zinc-600">
                  No photo yet
                </span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="scrollbar-none flex gap-2 overflow-x-auto p-0.5">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  aria-label={`Show photo ${i + 1} of ${images.length}`}
                  aria-pressed={selectedImage === i}
                  className={cn(
                    "relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-white ring-2 transition-[box-shadow,opacity] duration-150",
                    selectedImage === i
                      ? "ring-brand-600"
                      : "opacity-70 ring-transparent hover:opacity-100",
                  )}
                >
                  <SafeImage
                    src={img.url}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-contain p-[6%]"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Buy box */}
        <section
          aria-label="Product details"
          className="lg:sticky lg:top-20 lg:self-start"
        >
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <Link
                href={`/categories/${category.slug}`}
                className="rounded text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {category.name}
              </Link>
            )}
            {product.condition !== "new" && (
              <Badge tone="warning" size="sm">
                <span className="capitalize">{product.condition}</span>
              </Badge>
            )}
          </div>

          <h1 className="mt-2 text-3xl font-bold leading-tight text-zinc-950 dark:text-white sm:text-4xl">
            {product.name}
          </h1>

          {rating.count > 0 && (
            <a
              href="#product-tabs"
              className="mt-3 inline-flex items-center gap-2 rounded text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <Stars rating={rating.average} />
              <span className="tabular font-mono">
                {rating.average.toFixed(1)}
              </span>
              <span>
                ({rating.count} review{rating.count !== 1 ? "s" : ""})
              </span>
            </a>
          )}

          {selectedVariant && (
            <div className="mt-6">
              <Price amount={price} compareAt={was || null} size="xl" />
              {saving > 0 && (
                <p className="mt-1.5 text-sm font-medium text-brand-700 dark:text-brand-400">
                  You save{" "}
                  <span className="tabular font-mono">{formatKES(saving)}</span>{" "}
                  ({Math.round((saving / was) * 100)}%)
                </p>
              )}
            </div>
          )}

          {variants.length > 1 && (
            <fieldset className="mt-8">
              <legend className="mb-3 text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Options
              </legend>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const selected = selectedVariant?.id === v.id;
                  const soldOut = availableOf(v) === 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectVariant(v)}
                      aria-pressed={selected}
                      className={cn(
                        "h-10 rounded-full border px-4 text-sm font-medium transition-colors duration-150",
                        selected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500",
                        soldOut &&
                          !selected &&
                          "text-zinc-400 line-through decoration-zinc-400/70 dark:text-zinc-600",
                      )}
                    >
                      {variantLabel(v)}
                      {soldOut && <span className="sr-only"> (sold out)</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {isAdmin ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="rounded-md bg-zinc-600 px-2 py-0.5 text-xs font-medium text-white">
                  Admin
                </span>
                You&apos;re viewing this as an admin.
              </span>
              <ButtonLink
                href={`/admin/products/${product.id}/edit`}
                variant="secondary"
                size="sm"
              >
                <Icon name="edit" size={14} />
                Edit listing
              </ButtonLink>
            </div>
          ) : inCart ? (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-600/30 bg-brand-600/[0.06] px-4 py-3">
              <span
                className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200"
                role="status"
              >
                <Icon
                  name="check"
                  className="text-brand-600 dark:text-brand-400"
                />
                In your cart
              </span>
              <ButtonLink href="/cart" size="sm">
                <Icon name="cart" size={14} />
                View cart
              </ButtonLink>
            </div>
          ) : (
            <div className="mt-8 flex gap-3">
              <div
                className="flex h-11 items-center rounded-lg border border-zinc-300 dark:border-zinc-700"
                role="group"
                aria-label="Quantity"
              >
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-full w-11 items-center justify-center rounded-l-lg text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <Icon name="minus" />
                </button>
                <span
                  className="tabular w-9 text-center font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  aria-live="polite"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(left, q + 1))}
                  disabled={!selectedVariant || quantity >= left}
                  aria-label="Increase quantity"
                  className="flex h-full w-11 items-center justify-center rounded-r-lg text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <Icon name="plus" />
                </button>
              </div>
              <Button
                size="lg"
                onClick={handleAddToCart}
                isLoading={adding}
                disabled={outOfStock}
                className="flex-1"
              >
                {!outOfStock && <Icon name="cart" />}
                {outOfStock ? "Out of stock" : "Add to cart"}
              </Button>
            </div>
          )}

          {lowStock && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
              <Icon name="clock" size={14} />
              Only {left} left
            </p>
          )}

          <ul className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
            <li className="flex items-center gap-3 px-4 py-3.5">
              <Icon name="store" className="shrink-0 text-zinc-400" />
              <span className="min-w-0 flex-1 text-zinc-600 dark:text-zinc-400">
                Sold and delivered by{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  Soko
                </span>
              </span>
              {seller?.isVerified && (
                <Badge tone="success" size="sm">
                  <Icon name="shield" size={12} />
                  Verified
                </Badge>
              )}
            </li>
            <li className="flex items-center gap-3 px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
              <Icon name="phone" className="shrink-0 text-zinc-400" />
              Pay securely with M-Pesa at checkout
            </li>
            <li className="flex items-center gap-3 px-4 py-3.5 text-zinc-600 dark:text-zinc-400">
              <Icon name="truck" className="shrink-0 text-zinc-400" />
              Delivery across Kenya, fee shown at checkout
            </li>
          </ul>

          {tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Tags">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div id="product-tabs" className="scroll-mt-20">
        <Tabs
          label="Product information"
          tabs={[
            {
              id: "description",
              label: "Description",
              content: product.description ? (
                <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No description yet.
                </p>
              ),
            },
            {
              id: "reviews",
              label: (
                <>
                  Reviews
                  {rating.count > 0 && (
                    <span className="tabular ml-1.5 font-mono text-xs text-zinc-400">
                      {rating.count}
                    </span>
                  )}
                </>
              ),
              content: <ProductReviews productId={product.id} />,
            },
            { id: "shipping", label: "Shipping", content: <ShippingInfo /> },
          ]}
        />
      </div>
    </div>
  );
}

/** Delivery zones and fees, loaded when the page mounts. */
function ShippingInfo() {
  const [zones, setZones] = useState<DeliveryZone[] | null>(null);
  useEffect(() => {
    getAllDeliveryZones()
      .then(setZones)
      .catch(() => setZones([]));
  }, []);

  if (zones === null) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Loading delivery options…
      </p>
    );
  }
  if (zones.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        The delivery fee for your address is shown at checkout.
      </p>
    );
  }
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Fees depend on your delivery county. You&apos;ll see the exact amount at
        checkout before paying.
      </p>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Zone
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                County
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Arrives in
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Fee
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {zones.map((z) => (
              <tr key={z.id}>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                  {z.name}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {z.county}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {z.estimatedDays} day{z.estimatedDays === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Price amount={z.baseFee} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
