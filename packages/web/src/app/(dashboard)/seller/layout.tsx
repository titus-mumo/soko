"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";

const isSellerRole = (role?: string) => role === "seller" || role === "admin";

/**
 * Seller tools are only for sellers (and admins). The dashboard layout has
 * already restored the session by the time this renders, so the role in the
 * store is current.
 */
export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const allowed = isSellerRole(role);

  useEffect(() => {
    if (!allowed) {
      toast.info("Open a store to use seller tools.");
      router.replace("/dashboard");
    }
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
