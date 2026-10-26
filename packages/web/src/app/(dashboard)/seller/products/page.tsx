import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "My listings",
  description: "Manage your store's product listings.",
  path: "/seller/products",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
