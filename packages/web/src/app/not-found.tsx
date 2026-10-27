import Link from "next/link";
import { cookies } from "next/headers";
import { SignedInFrame } from "@/components/layout/SignedInFrame";
import { SESSION_HINT_COOKIE } from "@/lib/session-hint";
import { buttonClasses } from "@/components/ui/Button";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const content = (
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
  );

  // Signed in: keep the sidebar, so a broken link never strands anyone.
  if ((await cookies()).get(SESSION_HINT_COOKIE)?.value === "1")
    return (
      <SignedInFrame>
        <div className="flex min-h-[60vh] items-center justify-center">
          {content}
        </div>
      </SignedInFrame>
    );

  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950"
    >
      {content}
    </main>
  );
}
