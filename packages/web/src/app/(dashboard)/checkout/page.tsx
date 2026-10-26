import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Checkout",
  description: "Choose a delivery address and pay securely with M-Pesa.",
  path: "/checkout",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
