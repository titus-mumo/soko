import { isSessionRejected, refreshAccessToken } from "./api";
import { useAuthStore, type User } from "@/store/auth.store";

/**
 * Restores a session after a hard refresh. The access token lives in memory
 * and is lost on reload, but the HTTP-only refresh cookie survives — so try
 * it before deciding the user is signed out. The refresh also says whose
 * session it is, which replaces the remembered user (or ends the session if
 * they differ). Resolves to null when signed out.
 *
 * Only the API rejecting the session signs the user out. If it can't be
 * reached (or rate-limits, or errors), a remembered user stays signed in;
 * the next request retries the refresh.
 */
export async function restoreSession(): Promise<User | null> {
  const { user, accessToken } = useAuthStore.getState();
  if (user && accessToken) return user;

  try {
    await refreshAccessToken();
  } catch (err) {
    if (isSessionRejected(err)) return null;
    return user;
  }

  // The refresh stored the session's own account (checked against the
  // remembered one), so this is always who requests will run as.
  return useAuthStore.getState().user;
}

/** Runs `fn` once the persisted auth store has loaded from localStorage. */
export function onAuthHydrated(fn: () => void): () => void {
  if (useAuthStore.persist.hasHydrated()) {
    fn();
    return () => {};
  }
  return useAuthStore.persist.onFinishHydration(fn);
}

/**
 * Where to go after signing in: the ?next= path if it's a safe same-site
 * path, otherwise the role's home. Rejects absolute and protocol-relative
 * URLs so the parameter can't be used as an open redirect.
 */
export function postLoginPath(role: string): string {
  // Buyers land on the home page (shown with the sidebar once signed in);
  // admins in their own area.
  const home = role === "admin" ? "/admin" : "/";
  if (typeof window === "undefined") return home;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return home;
  // Admins don't use the shopper area and vice versa.
  if ((role === "admin") !== next.startsWith("/admin")) return home;
  return next;
}
