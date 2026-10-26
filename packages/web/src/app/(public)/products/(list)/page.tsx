import { pageMetadata } from "@/lib/seo";
import View from "./view";

export const metadata = pageMetadata({
  title: "Shop all products",
  description:
    "Browse phones, electronics, fashion and home goods from trusted Kenyan sellers. Pay with M-Pesa, delivered across Kenya.",
  path: "/products",
});

export default function Page() {
  return <View />;
}
