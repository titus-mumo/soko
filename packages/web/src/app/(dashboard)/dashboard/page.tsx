import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Dashboard",
  description: "Your Soko overview \u2014 cart and orders at a glance.",
  path: "/dashboard",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
