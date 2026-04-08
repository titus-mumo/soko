import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      setUser: (user) => set({ user }),
      setAuth: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "soko-auth",
      // Only persist the user — access token stays in memory only.
      // On refresh the user is restored from storage and a silent
      // token refresh is attempted in DashboardShell.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
