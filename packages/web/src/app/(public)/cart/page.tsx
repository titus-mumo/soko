import { pageMetadata } from "@/lib/seo";
import { CartView } from "@/components/cart/CartView";

// Open to everyone: signed-out shoppers keep a cart in their browser and
// only need an account at checkout.
export const metadata = pageMetadata({
  title: "Your cart",
  description: "Review the items in your cart before checkout.",
  path: "/cart",
  noIndex: true,
});

export default function Page() {
  return <CartView />;
}
