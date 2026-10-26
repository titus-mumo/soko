import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Notifications",
  description: "Updates about your orders, payments and account.",
  path: "/notifications",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
