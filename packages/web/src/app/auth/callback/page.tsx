import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Signing in",
  description: "Completing Google sign-in.",
  path: "/auth/callback",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
