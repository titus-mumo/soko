import { pageMetadata } from "@/lib/seo";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to Soko to shop and track your orders.",
  path: "/login",
});

export default function LoginPage() {
  return <LoginForm />;
}
