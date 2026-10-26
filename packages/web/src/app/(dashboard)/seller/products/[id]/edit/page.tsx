import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import View from "./view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata({
    title: "Edit listing",
    description: "Update a product listing.",
    path: `/seller/products/${id}/edit`,
    noIndex: true,
  });
}

export default function Page() {
  return <View />;
}
