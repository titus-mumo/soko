import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Confirm payment",
  description:
    "Approve the M-Pesa prompt on your phone to complete your order.",
  path: "/checkout/pending",
  noIndex: true,
});

export default function Page() {
  return <View />;
}
