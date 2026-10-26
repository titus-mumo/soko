import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Disputes",
  description: "Handle buyer disputes.",
  path: "/admin/disputes",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
