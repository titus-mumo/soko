import { pageMetadata } from "@/lib/seo";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = pageMetadata({
  title: "Create an account",
  description:
    "Join Soko \u2014 buy from trusted Kenyan sellers or open your own store.",
  path: "/register",
});

export default function RegisterPage() {
  return <RegisterForm />;
}
