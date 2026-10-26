import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setSessionHint, wantsAppLayout } from "@/lib/session-hint";

export interface User {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role: string;
}

/** Sellers can switch between running their store and shopping. */
export type Mode = "buying" | "selling";

/** Sellers and admins start in selling mode; buyers can only buy. */
export function defaultMode(role?: string): Mode {
  return role === "seller" || role === "admin" ? "selling" : "buying";
}

/** Whether this user can switch modes at all. */
export function canSell(user: User | null): boolean {
  return user?.role === "seller";
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  mode: Mode;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setAuth: (token: string, user: User) => void;
  setMode: (mode: Mode) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      mode: "buying",
      setAccessToken: (accessToken) => set({ accessToken }),
      // A role change (e.g. a buyer opening a store) resets the mode to the
      // new role's default; otherwise the current mode is kept.
      setUser: (user) => {
        setSessionHint(wantsAppLayout(user.role));
        set((s) =>
          s.user?.role === user.role
            ? { user }
            : { user, mode: defaultMode(user.role) },
        );
      },
      setAuth: (accessToken, user) => {
        // Lets the middleware serve shared pages in the app layout.
        setSessionHint(wantsAppLayout(user.role));
        set({ accessToken, user, mode: defaultMode(user.role) });
      },
      // Buyers have nothing to sell, so they stay in buying mode.
      setMode: (mode) =>
        set((s) => ({ mode: canSell(s.user) ? mode : "buying" })),
      logout: () => {
        setSessionHint(false);
        set({ accessToken: null, user: null, mode: "buying" });
      },
    }),
    {
      name: "soko-auth",
      // Persist the user and mode — the access token stays in memory only.
      // On refresh the user is restored from storage and a silent
      // token refresh is attempted in DashboardShell.
      partialize: (state) => ({ user: state.user, mode: state.mode }),
      // Sessions saved before modes existed have no mode; use the role's.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AuthState>;
        return {
          ...current,
          ...p,
          mode: p.mode ?? defaultMode(p.user?.role),
        };
      },
    },
  ),
);

/**
 * The persisted user, but only after mount. Server HTML is always rendered
 * as a guest, so components on public pages use this to avoid hydration
 * mismatches when a signed-in user's localStorage differs from the server.
 */
export function useSessionUser(): User | null {
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? user : null;
}

/** The effective mode: buyers are always buying. Hydration-safe like useSessionUser. */
export function useMode(): Mode {
  const user = useSessionUser();
  const mode = useAuthStore((s) => s.mode);
  return canSell(user) ? mode : "buying";
}
