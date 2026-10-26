import { ShopShell } from "@/components/layout/ShopShell";

// Public storefront — no auth gate, so pages render for crawlers and guests.
//
// No loading.tsx at this level: a Suspense boundary here would wrap every
// page below, and once it streams the status is 200 — notFound() in a
// product page would become a soft 404. Dynamic segments check existence in
// their own layout.tsx, above their loading.tsx, for the same reason.
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopShell>{children}</ShopShell>;
}
