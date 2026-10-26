import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import App from "../src/app";
import { limiter, RateLimiter, RULES } from "../src/lib/rate-limit";
import { createUser, Tracker, type TestUser } from "./helpers";

// The limiter is off for the rest of the suite; on here, behind a "proxy"
// so each test can be its own client via X-Forwarded-For.
const t = new Tracker();
let user: TestUser;
let ipSeq = 0;
const freshIp = () => `10.9.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

beforeAll(async () => {
  user = await createUser(t);
  process.env.RATE_LIMIT = "on";
  process.env.TRUST_PROXY = "1";
});
afterEach(() => limiter.reset());
afterAll(async () => {
  delete process.env.RATE_LIMIT;
  delete process.env.TRUST_PROXY;
  limiter.reset();
  await t.cleanup();
});

function send(
  method: string,
  path: string,
  opts: { ip?: string; token?: string; body?: unknown; origin?: string } = {},
) {
  const headers: Record<string, string> = {};
  if (opts.ip) headers["x-forwarded-for"] = opts.ip;
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.origin) headers.origin = opts.origin;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return App.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
  );
}

const rule = (name: string) => RULES.find((r) => r.name === name)!;
/** Uses up a client's allowance for a rule without sending the requests. */
const exhaust = (name: string, who: string) => {
  const r = rule(name);
  for (let i = 0; i < r.limit; i++)
    limiter.hit(`${name}|${who}`, r.limit, r.windowMs);
};

describe("rate limiting", () => {
  test("sign-in: 10 attempts a minute per IP, then 429 with Retry-After", async () => {
    const ip = freshIp();
    const body = {
      email: "nobody@test.soko.local",
      password: "wrong-password",
    };
    for (let i = 0; i < 10; i++) {
      const res = await send("POST", "/auth/login", { ip, body });
      expect(res.status).not.toBe(429);
      expect(res.headers.get("RateLimit-Remaining")).toBe(String(9 - i));
    }
    const blocked = await send("POST", "/auth/login", { ip, body });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await blocked.json()).message).toMatch(/too many requests/i);

    // Another client isn't affected.
    expect(
      (await send("POST", "/auth/login", { ip: freshIp(), body })).status,
    ).not.toBe(429);
  });

  test("OTP requests (each sends an SMS): 5 per 15 minutes per IP", async () => {
    const ip = freshIp();
    exhaust("otp", `ip:${ip}`);
    const res = await send("POST", "/auth/otp/request", {
      ip,
      body: { phone: "0700000000" },
    });
    expect(res.status).toBe(429);
    expect((await res.json()).message).toMatch(/minute/);
  });

  test("signed-in users get their own allowance, even sharing an IP", async () => {
    const ip = freshIp();
    exhaust("general", `ip:${ip}`);
    // Anonymous traffic from that IP is limited…
    expect((await send("GET", "/categories", { ip })).status).toBe(429);
    // …but a signed-in user behind the same carrier IP isn't.
    expect(
      (await send("GET", "/users/me", { ip, token: user.token })).status,
    ).toBe(200);
  });

  test("a forged token doesn't buy a fresh allowance", async () => {
    const ip = freshIp();
    exhaust("general", `ip:${ip}`);
    const res = await send("GET", "/categories", {
      ip,
      token: "not.a.real-token",
    });
    expect(res.status).toBe(429);
  });

  test("X-Forwarded-For is ignored unless TRUST_PROXY=1", async () => {
    process.env.TRUST_PROXY = "0";
    try {
      exhaust("sign-in", "ip:unknown");
      // A made-up forwarded IP doesn't escape the limit.
      const res = await send("POST", "/auth/login", {
        ip: freshIp(),
        body: { email: "x@test.soko.local", password: "x" },
      });
      expect(res.status).toBe(429);
    } finally {
      process.env.TRUST_PROXY = "1";
    }
  });

  test("the 429 carries CORS headers, so the web app can read it", async () => {
    const ip = freshIp();
    exhaust("general", `ip:${ip}`);
    const res = await send("GET", "/categories", {
      ip,
      origin: "http://localhost:3000",
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });

  test("the web app's server is exempt with the internal key — and only with it", async () => {
    process.env.INTERNAL_API_KEY = "test-internal-key-0123456789";
    try {
      exhaust("general", "ip:unknown");
      const req = (key?: string) =>
        App.handle(
          new Request("http://localhost/categories", {
            headers: key ? { "x-internal-key": key } : {},
          }),
        );
      expect((await req("test-internal-key-0123456789")).status).toBe(200);
      expect((await req("wrong-key-wrong-key-wrong")).status).toBe(429);
      expect((await req()).status).toBe(429);
    } finally {
      delete process.env.INTERNAL_API_KEY;
    }
  });

  test("M-Pesa callbacks are never limited", async () => {
    const ip = freshIp();
    exhaust("general", `ip:${ip}`);
    const res = await send("POST", "/payments/callback", { ip, body: {} });
    expect(res.status).not.toBe(429);
  });

  test("windows reset", () => {
    const l = new RateLimiter();
    const t0 = 1_000_000;
    expect(l.hit("k", 2, 1000, t0).allowed).toBe(true);
    expect(l.hit("k", 2, 1000, t0 + 1).allowed).toBe(true);
    expect(l.hit("k", 2, 1000, t0 + 2).allowed).toBe(false);
    expect(l.hit("k", 2, 1000, t0 + 1000).allowed).toBe(true);
  });
});
