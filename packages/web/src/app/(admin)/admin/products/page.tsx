import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Products",
  description: "Soko's catalogue: create, edit and publish listings.",
  path: "/admin/products",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
