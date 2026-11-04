import { pageMetadata } from "@/lib/seo";
import NotificationsView from "@/app/(dashboard)/notifications/view";

export const metadata = pageMetadata({
  title: "Inbox",
  description: "Alerts and messages for admins.",
  path: "/admin/inbox",
  noIndex: true,
});

export default function Page() {
  return <NotificationsView admin />;
}
