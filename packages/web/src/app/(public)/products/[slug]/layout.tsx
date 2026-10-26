import { notFound } from "next/navigation";
import { fetchPublicProduct } from "@/lib/server-api";

// Sits above this segment's loading.tsx. Checking existence here, before the
// loading boundary, lets a missing product return a real 404 status — once a
// boundary starts streaming, the status is already 200. Client navigation
// still shows the skeleton instantly, since Next prefetches up to it.
export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await fetchPublicProduct(slug))) notFound();
  return children;
}
