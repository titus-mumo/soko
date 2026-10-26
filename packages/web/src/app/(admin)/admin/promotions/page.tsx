import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Promotions",
  description: "Platform-wide promo codes.",
  path: "/admin/promotions",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
