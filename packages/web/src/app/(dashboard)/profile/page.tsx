import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Account",
  description: "Manage your Soko account details.",
  path: "/profile",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
