import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Seller orders",
  description: "Fulfil orders placed with your store.",
  path: "/seller/orders",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
