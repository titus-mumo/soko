// A readable, non-secret cookie saying "this browser has a signed-in
// shopper". The middleware uses it to serve shared pages (home, products,
// categories, cart) inside the app layout with the sidebar instead of the
// public navbar layout. It grants nothing: the app layout still restores the
// session itself and drops the hint if that fails.
//
// Admins get it too: on the shop pages they see the admin sidebar.

export const SESSION_HINT_COOKIE = "soko_session";

const MAX_AGE = 60 * 60 * 24 * 30; // matches a long-lived refresh session

export function setSessionHint(on: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? `${SESSION_HINT_COOKIE}=1; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
    : `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === `${SESSION_HINT_COOKIE}=1`);
}

/**
 * Whether this user should browse the shared pages inside the app layout —
 * every signed-in user, so the sidebar never disappears. Admins get it with
 * the admin navigation.
 */
export function wantsAppLayout(role?: string): boolean {
  return role === "buyer" || role === "seller" || role === "admin";
}

/**
 * Public URLs that signed-in shoppers see with the sidebar. The middleware
 * serves these from /app/… — keep the two lists in sync via this function.
 */
export function isSharedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/delivery" ||
    pathname === "/cart" ||
    /^\/(terms|privacy|returns|cookies)$/.test(pathname) ||
    /^\/(products|categories)(\/[^/]+)?$/.test(pathname)
  );
}
