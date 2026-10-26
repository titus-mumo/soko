import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950"
    >
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Soko
        </p>
        <h1 className="sr-only">Page not found</h1>
        <EmptyState
          icon="search"
          title="We couldn't find that page"
          description="The link may be broken, or the product may no longer be listed."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/products"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Browse products
              </Link>
              <Link
                href="/categories"
                className={buttonClasses({ variant: "secondary", size: "md" })}
              >
                Categories
              </Link>
            </div>
          }
        />
      </div>
    </main>
  );
}
