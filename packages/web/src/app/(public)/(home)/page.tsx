import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { HomeView } from "@/components/home/HomeView";

// Catalogue changes often enough; refresh the server render every minute.
export const revalidate = 60;

export const metadata: Metadata = {
  // Absolute so the root template doesn't append "| Soko" twice.
  title: { absolute: `${SITE_NAME} — Kenya's marketplace` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeView hero />;
}
