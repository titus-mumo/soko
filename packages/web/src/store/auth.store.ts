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

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => {
        setSessionHint(wantsAppLayout(user.role));
        set({ user });
      },
      setAuth: (accessToken, user) => {
        // Lets the middleware serve shared pages in the app layout.
        setSessionHint(wantsAppLayout(user.role));
        set({ accessToken, user });
      },
      logout: () => {
        setSessionHint(false);
        set({ accessToken: null, user: null });
      },
    }),
    {
      name: "soko-auth",
      // Persist the user — the access token stays in memory only. On
      // refresh the user is restored from storage and a silent token
      // refresh is attempted in DashboardShell.
      partialize: (state) => ({ user: state.user }),
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
