import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "New listing",
  description: "Add a product to your store.",
  path: "/seller/products/new",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
