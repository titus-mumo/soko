import { notFound } from "next/navigation";
import { fetchCategory } from "@/lib/server-api";

// Sits above this segment's loading.tsx. Checking existence here, before the
// loading boundary, lets a missing category return a real 404 status — once a
// boundary starts streaming, the status is already 200. Client navigation
// still shows the skeleton instantly, since Next prefetches up to it.
export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await fetchCategory(slug))) notFound();
  return children;
}
