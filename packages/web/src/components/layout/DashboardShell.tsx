"use client";

import { useEffect, useState } from "react";
import { adoptGuestCart } from "@/lib/guest-cart";
import { useSyncSellerProfile } from "@/store/seller.store";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { onAuthHydrated, restoreSession } from "@/lib/session";
import { syncCartTotals, syncUnreadCount } from "@/lib/sync";
import { AppFrame } from "./AppFrame";
import { AppShellSkeleton } from "./AppShellSkeleton";
import { isSharedPath, setSessionHint } from "@/lib/session-hint";

const UNREAD_POLL_MS = 60_000;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  // Stays false until Zustand has rehydrated from localStorage AND any
  // needed silent refresh has finished — never redirect before then.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const runAuth = async () => {
      const user = await restoreSession();
      if (cancelled) return;

      if (!user) {
        logout(); // also clears the session hint
        // A shared page (home, products…) reached via a stale hint: show
        // its public version rather than demanding a sign-in.
        if (isSharedPath(pathname)) window.location.reload();
        else router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      // Admins have their own area.
      if (user.role === "admin") {
        if (isSharedPath(pathname)) {
          setSessionHint(false);
          window.location.reload();
        } else {
          router.replace("/admin");
        }
        return;
      }
      // Before any page reads the cart: bring in items added while signed out.
      await adoptGuestCart();
      if (cancelled) return;
      setReady(true);
    };

    // Wait for the store to load from localStorage before reading the user.
    const unsub = onAuthHydrated(() => {
      runAuth();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per mount

  // Seller store id, so product cards can recognise own listings.
  useSyncSellerProfile(ready);

  // Populate the nav badges once authenticated, and keep unread fresh.
  useEffect(() => {
    if (!ready) return;
    syncCartTotals();
    syncUnreadCount();
    const interval = setInterval(syncUnreadCount, UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [ready]);

  if (!ready) return <AppShellSkeleton label="Loading your account" />;

  return <AppFrame>{children}</AppFrame>;
}
