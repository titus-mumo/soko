/**
 * The API's base URL, without a trailing slash — so `${API_URL}/products`
 * is right whether NEXT_PUBLIC_API_URL was set as "https://api.x" or
 * "https://api.x/" (a doubled slash is a different, unknown route).
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
