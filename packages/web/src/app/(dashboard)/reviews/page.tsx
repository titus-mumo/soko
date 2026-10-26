import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Your reviews",
  description: "Review products you've received.",
  path: "/reviews",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
