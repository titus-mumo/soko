import Link from "next/link";
import {
  fetchDeliveryZones,
  fetchCatalogue,
  fetchRootCategories,
} from "@/lib/server-api";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { SellerCta } from "@/components/home/SellerCta";
import { categoryIcon } from "@/components/home/categoryIcon";
import {
  ProductCard,
  ProductGrid,
  fromCatalogue,
} from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { buttonClasses } from "@/components/ui/Button";

function SectionHeading({
  id,
  title,
  subtitle,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2
          id={id}
          className="text-2xl font-bold text-zinc-950 dark:text-white"
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded text-sm font-medium text-zinc-600 transition-colors hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-500"
        >
          {linkLabel ?? "View all"}
          <Icon name="arrow-right" size={14} />
        </Link>
      )}
    </div>
  );
}

const pill =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-150";

/**
 * The home page. Guests get the hero banner; signed-in shoppers skip it and
 * land straight on categories and products.
 */
export async function HomeView({ hero }: { hero: boolean }) {
  const [categories, products, zones] = await Promise.all([
    fetchRootCategories(),
    // Newest 8, card-ready, in one request.
    fetchCatalogue({ limit: 8 }).then((page) => page.items),
    // Only the hero uses the delivery coverage.
    hero ? fetchDeliveryZones() : Promise.resolve([]),
  ]);
  const counties = new Set(zones.map((z) => z.county.trim().toLowerCase()))
    .size;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl("/"),
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl("/products")}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />

      {hero && <HeroCarousel counties={counties} />}

      <div className="mx-auto max-w-7xl space-y-16 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* Category pills */}
        <nav aria-label="Categories">
          <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <li>
              <Link
                href="/categories"
                className={`${pill} border-brand-600 bg-brand-600/10 text-brand-700 dark:text-brand-400`}
              >
                <Icon name="grid" size={16} />
                All categories
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categories/${c.slug}`}
                  className={`${pill} border-zinc-200 bg-white text-zinc-700 hover:border-brand-600 hover:text-brand-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-500 dark:hover:text-brand-500`}
                >
                  <Icon name={categoryIcon(c)} size={16} />
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Featured */}
        <section aria-labelledby="featured-heading">
          <SectionHeading
            id="featured-heading"
            title="Featured on Soko"
            subtitle="The latest listings from sellers across Kenya"
            href="/products"
            linkLabel="Browse all"
          />
          {products.length > 0 ? (
            <ProductGrid>
              {products.map((p, i) => (
                <ProductCard
                  key={p.id}
                  {...fromCatalogue(p)}
                  priority={i < 4}
                />
              ))}
            </ProductGrid>
          ) : (
            <EmptyState
              icon="package"
              title="No products listed yet"
              description="New listings will show up here."
              titleAs="h3"
            />
          )}
        </section>

        {/* Browse by category */}
        {categories.length > 0 && (
          <section aria-labelledby="categories-heading">
            <SectionHeading
              id="categories-heading"
              title="Shop by category"
              href="/categories"
              linkLabel="All categories"
            />
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/categories/${c.slug}`}
                    className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-brand-600 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight dark:hover:border-brand-500"
                  >
                    <span className="flex aspect-[4/3] items-center justify-center bg-zinc-100 text-zinc-400 transition-colors group-hover:text-brand-600 dark:bg-zinc-800 dark:text-zinc-500 dark:group-hover:text-brand-500">
                      <Icon
                        name={categoryIcon(c)}
                        size={40}
                        strokeWidth={1.25}
                        className="transition-transform duration-200 group-hover:scale-110"
                      />
                    </span>
                    <span className="flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {c.name}
                      <Icon
                        name="arrow-right"
                        size={14}
                        className="text-zinc-400 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <SellerCta />

        {/* Keeps the catalogue reachable even when there are few listings. */}
        <p className="text-center">
          <Link
            href="/products"
            className={buttonClasses({ variant: "secondary" })}
          >
            See everything on Soko
          </Link>
        </p>
      </div>
    </>
  );
}
