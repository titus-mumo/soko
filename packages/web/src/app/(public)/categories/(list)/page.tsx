import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchRootCategories, fetchSubCategories } from "@/lib/server-api";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata = pageMetadata({
  title: "Shop by category",
  description:
    "Browse Soko by category — phones, audio, fashion, home and kitchen from sellers across Kenya.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const roots = await fetchRootCategories();
  const subs = await Promise.all(roots.map((r) => fetchSubCategories(r.id)));
  const categories = roots.map((r, i) => ({ ...r, subs: subs[i] }));

  return (
    <div className="space-y-6">
      <JsonLd data={breadcrumbJsonLd([["Categories", "/categories"]])} />
      <PageHeader title="Categories" description="Browse by category" />

      {categories.length === 0 ? (
        <EmptyState
          icon="grid"
          title="No categories yet"
          description="Categories will appear here once the catalogue is set up."
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/categories/${cat.slug}`}
                className="group flex h-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight dark:hover:border-zinc-700"
              >
                <div className="min-w-0">
                  <h2 className="font-medium text-zinc-800 group-hover:text-zinc-900 dark:text-zinc-200 dark:group-hover:text-zinc-50">
                    {cat.name}
                  </h2>
                  {cat.subs.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {cat.subs.map((s) => s.name).join(" · ")}
                    </p>
                  )}
                </div>
                <Icon
                  name="chevron-right"
                  size={14}
                  className="shrink-0 text-zinc-300 group-hover:text-zinc-400 dark:text-zinc-700 dark:group-hover:text-zinc-500"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
