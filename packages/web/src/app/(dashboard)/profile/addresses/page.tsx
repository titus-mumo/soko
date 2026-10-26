import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Delivery addresses",
  description: "Manage the addresses your orders are delivered to.",
  path: "/profile/addresses",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
