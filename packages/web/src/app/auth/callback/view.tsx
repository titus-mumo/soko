"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useAuthStore, type User } from "@/store/auth.store";
import { postLoginPath } from "@/lib/session";
import { BROWSER_API_URL as API_BASE } from "@/lib/env";

/**
 * The server redirects here after Google OAuth with `accessToken` and `user`
 * (JSON, optionally base64url-encoded). Both the query string and the URL
 * fragment are accepted — the fragment is preferred because it never reaches
 * server logs or Referer headers.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthCallback />
    </Suspense>
  );
}

function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  const attempts = [
    () => JSON.parse(raw),
    () => JSON.parse(atob(raw.replace(/-/g, "+").replace(/_/g, "/"))),
  ];
  for (const attempt of attempts) {
    try {
      const value = attempt();
      if (value && typeof value.id === "string") return value as User;
    } catch {
      // try next format
    }
  }
  return null;
}

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice in dev; only consume the token once.
    if (handled.current) return;
    handled.current = true;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const get = (key: string) => hash.get(key) ?? searchParams.get(key);

    // Don't leave the token in the address bar or browser history.
    window.history.replaceState(null, "", window.location.pathname);

    const oauthError = get("error");
    if (oauthError) {
      setError(oauthError);
      return;
    }

    const accessToken = get("accessToken");
    if (!accessToken) {
      setError("Sign-in didn't complete. Please try again.");
      return;
    }

    const finish = (user: User) => {
      setAuth(accessToken, user);
      // Drop pages cached as a guest before navigating in the new layout.
      router.refresh();
      router.replace(postLoginPath(user.role));
    };

    const user = parseUser(get("user"));
    if (user) {
      finish(user);
      return;
    }

    // No user payload — look the user up with the new token.
    axios
      .get(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true,
      })
      .then(({ data }) => finish(data.data))
      .catch(() =>
        setError("Couldn't load your account. Please sign in again."),
      );
  }, [router, searchParams, setAuth]);

  if (!error) return <Spinner />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Google sign-in failed
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
        <Link
          href="/login"
          className={buttonClasses({
            variant: "primary",
            size: "md",
            className: "mt-6",
          })}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-950">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-brand-600 dark:border-zinc-700" />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Signing you in…
      </p>
    </div>
  );
}
