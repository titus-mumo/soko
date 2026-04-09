"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { ToastContainer } from "@/components/ui/Toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const logout = useAuthStore((s) => s.logout);
  // Stays true until we've both waited for Zustand to rehydrate from localStorage
  // AND completed any necessary silent token refresh.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // useAuthStore.persist.hasHydrated() is false on the very first render —
    // we must wait for the store to finish loading from localStorage before
    // reading user, otherwise user is always null and we redirect immediately.
    const runAuth = () => {
      const { user, accessToken } = useAuthStore.getState();

      if (!user) {
        router.replace("/login");
        return;
      }

      //Admin should not access this page
      if (user.role === "admin") {
        router.replace("/admin");
      }

      if (!accessToken) {
        // User survived refresh (persisted) but token is gone — silently renew
        axios
          .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
          .then(({ data }) => {
            setAccessToken(data.data.accessToken);
            setReady(true);
          })
          .catch(() => {
            logout();
            router.replace("/login");
          });
        return;
      }

      setReady(true);
    };

    if (useAuthStore.persist.hasHydrated()) {
      // Store already hydrated (e.g. navigating between pages)
      runAuth();
    } else {
      // Wait for rehydration to finish before checking auth
      const unsub = useAuthStore.persist.onFinishHydration(runAuth);
      return unsub;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600 dark:border-zinc-700" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />

      <ToastContainer />
    </div>
  );
}
