"use client";

import { useSessionUser } from "@/store/auth.store";
import { AppFrame } from "./AppFrame";

/**
 * The app layout (sidebar, top bar) for pages that live outside the account
 * area — e.g. "page not found" — so a signed-in user keeps their navigation
 * everywhere. Admins get the admin sidebar.
 */
export function SignedInFrame({ children }: { children: React.ReactNode }) {
  const user = useSessionUser();
  return (
    <AppFrame variant={user?.role === "admin" ? "admin" : "app"}>
      {children}
    </AppFrame>
  );
}
