import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Store promotions",
  description: "Discount codes for your store.",
  path: "/seller/promotions",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
