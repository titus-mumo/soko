import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Users",
  description: "Manage Soko users.",
  path: "/admin/users",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
