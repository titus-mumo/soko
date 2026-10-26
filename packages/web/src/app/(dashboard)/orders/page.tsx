import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Your orders",
  description: "Track and manage your Soko orders.",
  path: "/orders",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
