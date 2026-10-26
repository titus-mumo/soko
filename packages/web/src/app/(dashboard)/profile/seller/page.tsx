import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Your store",
  description: "Open or manage your Soko store.",
  path: "/profile/seller",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
