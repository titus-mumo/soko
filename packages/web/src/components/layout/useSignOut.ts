"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useNotificationStore } from "@/store/notification.store";

/** Signs out server-side and clears every client store. */
export function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear local state regardless — the user asked to sign out.
    } finally {
      useAuthStore.getState().logout();
      useCartStore.getState().clearCart();
      useNotificationStore.getState().clear();
      // Back to the public home page. Drop pages cached while signed in first
      // (they used the app layout); the session hint is already cleared, so
      // "/" now renders the guest version.
      router.refresh();
      router.replace("/");
    }
  };

  return { signOut, signingOut };
}
