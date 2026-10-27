import { pageMetadata } from "@/lib/seo";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = pageMetadata({
  title: "Create an account",
  description:
    "Join Soko \u2014 shop electronics, fashion and home goods and pay with M-Pesa.",
  path: "/register",
});

export default function RegisterPage() {
  return <RegisterForm />;
}
