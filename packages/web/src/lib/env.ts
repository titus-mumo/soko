/**
 * The API's base URL, without a trailing slash — so `${API_URL}/products`
 * is right whether NEXT_PUBLIC_API_URL was set as "https://api.x" or
 * "https://api.x/" (a doubled slash is a different, unknown route).
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

/**
 * With NEXT_PUBLIC_API_PROXY=1 the browser calls the API at /api on the
 * site's own domain, and Next.js forwards it (next.config.ts rewrites). The
 * sign-in cookie is then first-party: browsers block cookies from a
 * different site (e.g. a vercel.app page calling an onrender.com API), which
 * otherwise signs everyone out on refresh. Server-side rendering still calls
 * API_URL directly.
 */
export const API_PROXY = process.env.NEXT_PUBLIC_API_PROXY === "1";

/** Where the browser sends API requests. */
export const BROWSER_API_URL = API_PROXY ? "/api" : API_URL;
