import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Orders",
  description: "Review platform orders.",
  path: "/admin/orders",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
