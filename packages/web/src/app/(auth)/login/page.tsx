import { pageMetadata } from "@/lib/seo";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to Soko to shop, track orders and manage your store.",
  path: "/login",
});

export default function LoginPage() {
  return <LoginForm />;
}
