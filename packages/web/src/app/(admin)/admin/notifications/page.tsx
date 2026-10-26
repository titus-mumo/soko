import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Send notifications",
  description: "Message users or broadcast announcements.",
  path: "/admin/notifications",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
