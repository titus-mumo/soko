import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Admin overview",
  description: "Soko platform administration.",
  path: "/admin",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
