"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { getSellerProfile } from "@/lib/seller.api";
import { useAuthStore } from "./auth.store";
import type { SellerProfile } from "@/lib/types";

interface SellerStore {
  /** The signed-in seller's store. Null for buyers or before it loads. */
  sellerProfile: SellerProfile | null;
  setSellerProfile: (profile: SellerProfile | null) => void;
}

export const useSellerStore = create<SellerStore>()((set) => ({
  sellerProfile: null,
  setSellerProfile: (sellerProfile) => set({ sellerProfile }),
}));

/**
 * Loads the seller's store profile when a seller is signed in (and clears it
 * otherwise). Mount once per shell. The store id is what products reference
 * as `sellerId`, so this is how cards recognise the seller's own listings.
 */
export function useSyncSellerProfile(enabled = true) {
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  const hasToken = useAuthStore((s) => Boolean(s.accessToken));

  useEffect(() => {
    const { sellerProfile, setSellerProfile } = useSellerStore.getState();
    if (role !== "seller" || !userId) {
      if (sellerProfile) setSellerProfile(null);
      return;
    }
    if (!enabled || !hasToken || sellerProfile?.userId === userId) return;
    let cancelled = false;
    getSellerProfile()
      .then((p) => !cancelled && setSellerProfile(p))
      // No store yet (mid-onboarding) — nothing to guard.
      .catch(() => !cancelled && setSellerProfile(null));
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, role, hasToken]);
}

/** The store id of the signed-in seller, if any. */
export function useOwnStoreId(): string | null {
  return useSellerStore((s) => s.sellerProfile?.id ?? null);
}
