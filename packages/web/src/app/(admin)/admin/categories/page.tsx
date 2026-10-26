import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Categories",
  description: "Manage product categories.",
  path: "/admin/categories",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
