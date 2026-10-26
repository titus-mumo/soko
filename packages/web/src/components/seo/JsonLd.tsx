import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import type { Category, ProductImage, ProductVariant } from "@/lib/types";

/** Renders schema.org structured data. `<` is escaped so data can't close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const CONDITION: Record<string, string> = {
  new: "https://schema.org/NewCondition",
  used: "https://schema.org/UsedCondition",
  refurbished: "https://schema.org/RefurbishedCondition",
};

export function productJsonLd({
  name,
  slug,
  description,
  condition,
  images,
  variants,
  category,
  rating,
}: {
  name: string;
  slug: string;
  description?: string | null;
  condition: string;
  images: ProductImage[];
  variants: ProductVariant[];
  category?: Category | null;
  rating?: { average: number; count: number } | null;
}) {
  const prices = variants.map((v) => Number(v.price));
  const inStock = variants.some((v) => (v.availableQuantity ?? 0) > 0);
  const url = absoluteUrl(`/products/${slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url,
    ...(description && { description }),
    ...(images.length && { image: images.map((i) => i.url) }),
    ...(category && { category: category.name }),
    itemCondition: CONDITION[condition] ?? CONDITION.new,
    ...(prices.length && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "KES",
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: variants.length,
        availability: inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url,
        // Buyers deal with Soko; the listing's store is not named.
        seller: { "@type": "Organization", name: SITE_NAME },
      },
    }),
    ...(rating &&
      rating.count > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: rating.average.toFixed(1),
          reviewCount: rating.count,
        },
      }),
  };
}

/** Home → … → current page. Each item is [name, path]. */
export function breadcrumbJsonLd(items: [name: string, path: string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"] as const, ...items].map(
      ([name, path], i) => ({
        "@type": "ListItem",
        position: i + 1,
        name,
        item: absoluteUrl(path),
      }),
    ),
  };
}
