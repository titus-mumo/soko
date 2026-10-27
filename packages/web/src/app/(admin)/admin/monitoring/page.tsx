import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Monitoring",
  description: "Requests per hour, errors, latency and alerts.",
  path: "/admin/monitoring",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
