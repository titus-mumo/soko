import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";

// Account pages are private — keep them out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
