import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "New listing",
  description: "Add a product to Soko's catalogue.",
  path: "/admin/products/new",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
