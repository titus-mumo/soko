"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { onAuthHydrated, restoreSession } from "@/lib/session";
import { AppFrame } from "./AppFrame";
import { FullPageLoader } from "./FullPageLoader";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Stays false until Zustand has rehydrated AND any silent refresh is done.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runAuth = async () => {
      const user = await restoreSession();
      if (cancelled) return;

      if (!user) {
        useAuthStore.getState().logout();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (user.role !== "admin") {
        // Signed in, just not an admin — send them to their own area.
        router.replace("/dashboard");
        return;
      }
      setReady(true);
    };

    const unsub = onAuthHydrated(() => {
      runAuth();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per mount

  if (!ready) return <FullPageLoader label="Loading admin" />;

  return <AppFrame variant="admin">{children}</AppFrame>;
}
