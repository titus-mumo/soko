import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Disputes",
  description: "Raise and track disputes on your orders.",
  path: "/disputes",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
