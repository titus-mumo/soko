import type { Metadata } from "next";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  categoryTrail,
  fetchCategory,
  fetchCatalogue,
  fetchSubCategories,
} from "@/lib/server-api";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { MoreProducts } from "@/components/product/MoreProducts";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";

const getCategory = cache(fetchCategory);

const PAGE_SIZE = 24;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  // Resolve 404s here: metadata runs before the response starts streaming,
  // so this keeps a real 404 status instead of a soft 200.
  if (!category) notFound();
  return pageMetadata({
    title: `${category.name} — shop online in Kenya`,
    description: `Shop ${category.name.toLowerCase()} on Soko. Compare prices, pay with M-Pesa and get delivery across Kenya.`,
    path: `/categories/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const [subs, trail] = await Promise.all([
    fetchSubCategories(category.id),
    categoryTrail(category),
  ]);
  // First page server-rendered; the rest loads in the browser.
  const firstPage = await fetchCatalogue({
    category: category.slug,
    limit: PAGE_SIZE,
  });
  const products = firstPage.items;
  const count = firstPage.total ?? products.length;

  const crumbs: [string, string][] = [
    ["Categories", "/categories"],
    ...trail.map((c) => [c.name, `/categories/${c.slug}`] as [string, string]),
  ];

  return (
    <div className="space-y-6">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />

      <PageHeader
        title={category.name}
        description={`${count} product${count !== 1 ? "s" : ""}`}
      />

      {subs.length > 0 && (
        <nav aria-label={`${category.name} sub-categories`}>
          <ul className="flex flex-wrap gap-2">
            {subs.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/categories/${s.slug}`}
                  className="inline-block rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon="package"
          title={`No products in ${category.name} yet`}
          description="Check back soon, or browse the rest of the catalogue."
          action={
            <Link
              href="/products"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Browse all products
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="category-products">
          <h2 id="category-products" className="sr-only">
            Products in {category.name}
          </h2>
          <MoreProducts
            initial={products}
            initialCursor={firstPage.nextCursor}
            total={firstPage.total}
            category={category.slug}
            pageSize={PAGE_SIZE}
          />
        </section>
      )}
    </div>
  );
}
