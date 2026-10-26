import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Change password",
  description: "Update your Soko account password.",
  path: "/profile/password",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
