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
    title: "Order details",
    description: "Items, delivery, payment and tracking for your order.",
    path: `/orders/${id}`,
    noIndex: true,
  });
}

export default function Page() {
  return <View />;
}
