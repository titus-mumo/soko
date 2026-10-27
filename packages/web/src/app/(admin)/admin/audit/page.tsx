import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Audit log",
  description: "Every API request: who made it, what, and the outcome.",
  path: "/admin/audit",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
