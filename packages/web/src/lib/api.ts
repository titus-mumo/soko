import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

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

// On 401, attempt a silent token refresh once then retry the original request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);
