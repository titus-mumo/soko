"use client";

import { useEffect } from "react";
import { useSyncSellerProfile } from "@/store/seller.store";
import { useAuthStore } from "@/store/auth.store";
import { isSessionRejected, refreshAccessToken } from "@/lib/api";
import { onAuthHydrated } from "@/lib/session";
import { syncCartTotals, syncUnreadCount } from "@/lib/sync";
import { adoptGuestCart, syncGuestCartBadge } from "@/lib/guest-cart";
import { usePathname, useRouter } from "next/navigation";
import {
  hasSessionHint,
  isSharedPath,
  setSessionHint,
  wantsAppLayout,
} from "@/lib/session-hint";
import { ToastContainer } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

/**
 * Public storefront shell: navbar, page, footer. No auth gate — guests and
 * crawlers get this layout. Signed-in shoppers normally get the shared pages
 * in the app layout instead (the middleware rewrites on the session hint);
 * they land here on pages that aren't shared, or before the hint is set, and
 * get their token silently restored so the cart and badges work.
 */
export function ShopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // The home page lays out its own full-width sections.
  const fullBleed = pathname === "/";

  useSyncSellerProfile();

  useEffect(() => {
    const restore = async () => {
      const { user, accessToken, logout } = useAuthStore.getState();
      if (!user) {
        // Guests: show what's in their browser cart on the badge.
        syncGuestCartBadge();
        return;
      }
      if (!accessToken) {
        try {
          await refreshAccessToken();
        } catch (err) {
          // Session over — keep browsing as a guest. A blip (API down,
          // rate limit) isn't a sign-out; the next request retries.
          if (isSessionRejected(err)) {
            logout();
            syncGuestCartBadge();
          }
          return;
        }
      }
      // Signed in from before the session hint existed (or the cookie was
      // cleared): set it and re-render this page in the app layout.
      if (wantsAppLayout(user.role) && !hasSessionHint()) {
        setSessionHint(true);
        if (isSharedPath(window.location.pathname)) {
          router.refresh();
          return;
        }
      }
      if (user.role !== "admin") await adoptGuestCart();
      else syncCartTotals();
      syncUnreadCount();
    };

    return onAuthHydrated(() => {
      restore();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once per mount

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "flex-1 focus:outline-none",
          !fullBleed &&
            "mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8",
        )}
      >
        {children}
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
