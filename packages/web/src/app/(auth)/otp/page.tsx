import type { Metadata } from "next";
import { OtpForm } from "@/components/auth/OtpForm";

export const metadata: Metadata = { title: "Phone sign in" };

export default function OtpPage() {
  return <OtpForm />;
}
