import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Delivery zones",
  description: "Manage delivery zones and fees.",
  path: "/admin/delivery",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
