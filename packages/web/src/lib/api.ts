import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import type { ApiResponse } from "./types";
import { BROWSER_API_URL as BASE_URL } from "./env";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the HTTP-only refresh token cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token from in-memory store to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

declare module "axios" {
  interface AxiosRequestConfig {
    /** On an expired session, sign out locally but don't send to /login. */
    skipAuthRedirect?: boolean;
  }
}

// Concurrent 401s share one refresh call, so a rotating refresh token
// isn't spent twice.
let refreshing: Promise<string> | null = null;

/** Exchanges the refresh cookie for a new access token and stores it. */
export function refreshAccessToken(): Promise<string> {
  refreshing ??= axios
    .post<ApiResponse<{ accessToken: string }>>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then(({ data }) => {
      const token = data.data.accessToken;
      useAuthStore.getState().setAccessToken(token);
      return token;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Whether a failed refresh means the session is really over. Only the API
 * saying so (401/403) counts; an unreachable API, a rate limit or a server
 * error leaves the user signed in to try again.
 */
export function isSessionRejected(err: unknown): boolean {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  return status === 401 || status === 403;
}

/** Sends the browser to sign in, remembering where it was. */
function redirectToLogin() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname === "/login") return; // don't loop
  window.location.href = `/login?next=${encodeURIComponent(pathname + search)}`;
}

// On 401: refresh once and retry the original request. Only if the refresh
// itself fails is the session over — then sign out and go to /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;

    const isAuthCall = original?.url?.startsWith("/auth/");
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      // A 401 from login/OTP means bad credentials, not an expired token.
      !isAuthCall
    ) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        // A blip (API down, 429, 500) isn't a sign-out: fail this request
        // and let the next one try again.
        if (!isSessionRejected(refreshError)) return Promise.reject(error);
        useAuthStore.getState().logout();
        // Callers that can carry on signed out (e.g. adding to a guest cart)
        // opt out of the redirect and handle the 401 themselves.
        if (!original.skipAuthRedirect) redirectToLogin();
      }
    }

    return Promise.reject(error);
  },
);
