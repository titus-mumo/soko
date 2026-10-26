import { pageMetadata } from "@/lib/seo";
import { OtpForm } from "@/components/auth/OtpForm";

export const metadata = pageMetadata({
  title: "Sign in with your phone",
  description: "Get a one-time code by SMS to sign in to Soko.",
  path: "/otp",
  noIndex: true,
});

export default function OtpPage() {
  return <OtpForm />;
}
