import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Hub",
  description: "Receive items, consolidate orders and ship them.",
  path: "/admin/hub",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
