import { NextResponse, type NextRequest } from "next/server";
import { SESSION_HINT_COOKIE, isSharedPath } from "@/lib/session-hint";

const isDev = process.env.NODE_ENV !== "production";
const API_ORIGIN = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
).origin;

/**
 * Content-Security-Policy. 'unsafe-inline' scripts are required for Next's
 * inline bootstrap and the no-flash theme script; moving to nonces would
 * force every page to render dynamically. Images allow any https host
 * because sellers supply their own image URLs.
 */
function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:", API_ORIGIN],
    "font-src": ["'self'", "data:"],
    // Dev needs the HMR websocket.
    "connect-src": ["'self'", API_ORIGIN, ...(isDev ? ["ws:", "wss:"] : [])],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}

const CSP = contentSecurityPolicy();

/** Internal prefix for the signed-in copies of shared pages (see session-hint.ts). */
const APP_PREFIX = "/app";

/**
 * Signed-in shoppers get shared pages (home, products, categories, stores)
 * inside the app layout with the sidebar; everyone else gets the public
 * layout. Same URL either way — this is a rewrite, not a redirect.
 */
function route(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // The /app copies are internal; send direct visits to the real URL.
  if (pathname === APP_PREFIX || pathname.startsWith(`${APP_PREFIX}/`)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(APP_PREFIX.length) || "/";
    return NextResponse.redirect(url);
  }

  if (
    req.cookies.get(SESSION_HINT_COOKIE)?.value === "1" &&
    isSharedPath(pathname)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? APP_PREFIX : `${APP_PREFIX}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export function middleware(req: NextRequest) {
  const res = route(req);

  // Enforced in production. Report-only in development so a policy gap shows
  // up as a console warning instead of silently breaking the app — check the
  // browser console for "[Report Only]" violations before deploying.
  res.headers.set(
    isDev ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy",
    CSP,
  );

  if (!isDev) {
    // Only meaningful over HTTPS; browsers ignore it on plain http.
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  return res;
}

export const config = {
  // Skip static assets and the image optimizer — they don't need a CSP.
  matcher: [
    // Static assets and metadata routes (icons, share images, manifest)
    // need no CSP or session rewrites.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|opengraph-image|twitter-image|manifest.webmanifest|robots.txt|sitemap.xml|api/).*)",
  ],
};
