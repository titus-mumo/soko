import Elysia from "elysia";
import { timingSafeEqual } from "node:crypto";
import { verifyAccessToken } from "./jwt";

// Request rate limits, per client, in fixed windows.
//
// Counters live in this process's memory: fine for one API instance. Behind
// a load balancer with several instances each keeps its own counts (limits
// become per-instance) — move the store to Redis then.
//
// Clients are identified by their user id when the request carries a valid
// access token (many Kenyan mobile users share one carrier IP), otherwise by
// IP. Sign-in and other abuse-prone endpoints always count per IP, so new
// tokens can't buy more attempts.

export interface RateRule {
  name: string;
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
  match: (method: string, path: string) => boolean;
  /** "ip": always per IP. "client": per user when signed in, else per IP. */
  by: "ip" | "client";
}

const MINUTE = 60_000;
const is = (m: string, p: string | RegExp) => (method: string, path: string) =>
  method === m && (typeof p === "string" ? path === p : p.test(path));

// First match wins; the last rule is the general limit.
export const RULES: RateRule[] = [
  // Each OTP request sends an SMS (costs money, can be used to spam a phone).
  {
    name: "otp",
    limit: 5,
    windowMs: 15 * MINUTE,
    by: "ip",
    match: is("POST", "/auth/otp/request"),
  },
  {
    name: "sign-in",
    limit: 10,
    windowMs: MINUTE,
    by: "ip",
    match: (m, p) =>
      m === "POST" &&
      ["/auth/login", "/auth/register", "/auth/otp/verify"].includes(p),
  },
  {
    name: "refresh",
    limit: 30,
    windowMs: MINUTE,
    by: "ip",
    match: is("POST", "/auth/refresh"),
  },
  {
    name: "password",
    limit: 5,
    windowMs: 15 * MINUTE,
    by: "client",
    match: is("PATCH", "/users/me/password"),
  },
  // Each one pushes an M-Pesa prompt to the buyer's phone.
  {
    name: "payment",
    limit: 5,
    windowMs: MINUTE,
    by: "client",
    match: is("POST", "/payments/me/initiate"),
  },
  // Stops promo codes being guessed.
  {
    name: "promo",
    limit: 20,
    windowMs: MINUTE,
    by: "client",
    match: (m, p) =>
      m === "POST" &&
      (p === "/promotions/preview" || p === "/promotions/me/apply"),
  },
  // Suggestions fire as people type.
  {
    name: "suggest",
    limit: 120,
    windowMs: MINUTE,
    by: "client",
    match: is("GET", "/search/suggest"),
  },
  {
    name: "general",
    limit: 300,
    windowMs: MINUTE,
    by: "client",
    match: () => true,
  },
];

/**
 * The web app's own server (Next.js rendering pages) fetches on behalf of
 * every visitor from one IP. It proves itself with INTERNAL_API_KEY — a
 * server-only secret, never sent to browsers — and isn't limited.
 */
function isInternal(request: Request): boolean {
  const key = Bun.env.INTERNAL_API_KEY;
  const sent = request.headers.get("x-internal-key");
  if (!key || key.length < 16 || !sent) return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Never limited: Safaricom's payment callbacks. */
const EXEMPT = new Set(["/payments/callback"]);

type Window = { count: number; resetAt: number };

export class RateLimiter {
  private windows = new Map<string, Window>();
  private lastSweep = 0;

  /** Counts a request; says whether it's allowed and how the window stands. */
  hit(key: string, limit: number, windowMs: number, now = Date.now()) {
    this.sweep(now);
    let w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, w);
    }
    w.count += 1;
    return {
      allowed: w.count <= limit,
      remaining: Math.max(0, limit - w.count),
      resetInMs: w.resetAt - now,
    };
  }

  reset() {
    this.windows.clear();
  }

  // Drop finished windows now and then, so memory stays bounded.
  private sweep(now: number) {
    if (now - this.lastSweep < MINUTE) return;
    this.lastSweep = now;
    for (const [key, w] of this.windows)
      if (w.resetAt <= now) this.windows.delete(key);
  }
}

export const limiter = new RateLimiter();

// Off in the test suite (requests there all come from one "client"); the
// rate-limit tests switch it on. Read per request so tests can toggle it.
const enabled = () =>
  (Bun.env.RATE_LIMIT ?? (Bun.env.NODE_ENV === "test" ? "off" : "on")) !==
  "off";

/**
 * The client's IP. X-Forwarded-For is only trusted when TRUST_PROXY=1 (the
 * API sits behind a proxy that sets it) — otherwise anyone could send a
 * fresh value per request and never be limited.
 */
function clientIp(request: Request, server: any): string {
  if (Bun.env.TRUST_PROXY === "1") {
    const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd;
  }
  return server?.requestIP?.(request)?.address ?? "unknown";
}

async function userIdOf(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await verifyAccessToken(auth.slice(7)).catch(() => null);
  return (payload?.userId as string | undefined) ?? null;
}

export const rateLimit = new Elysia({ name: "rate-limit" }).onRequest(
  async ({ request, server, set }) => {
    if (!enabled() || request.method === "OPTIONS") return;
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (EXEMPT.has(path) || isInternal(request)) return;

    const rule = RULES.find((r) => r.match(request.method, path))!;
    const ip = clientIp(request, server);
    const who =
      rule.by === "client"
        ? ((await userIdOf(request)) ?? `ip:${ip}`)
        : `ip:${ip}`;
    const { allowed, remaining, resetInMs } = limiter.hit(
      `${rule.name}|${who}`,
      rule.limit,
      rule.windowMs,
    );

    const resetSeconds = Math.ceil(resetInMs / 1000);
    set.headers["RateLimit-Limit"] = String(rule.limit);
    set.headers["RateLimit-Remaining"] = String(remaining);
    set.headers["RateLimit-Reset"] = String(resetSeconds);
    if (allowed) return;

    set.status = 429;
    set.headers["Retry-After"] = String(resetSeconds);
    return {
      success: false,
      message: `Too many requests. Please try again in ${
        resetSeconds >= 60
          ? `${Math.ceil(resetSeconds / 60)} minute(s)`
          : `${resetSeconds} seconds`
      }.`,
    };
  },
);
