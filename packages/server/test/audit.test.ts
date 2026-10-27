import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import postgres from "postgres";
import App from "../src/app";
import { flushAuditLog, redactQuery } from "../src/lib/audit";
import {
  evaluateAlerts,
  notifyAdminsOfAlerts,
  THRESHOLDS,
} from "../src/services/monitoring.service";
import {
  api,
  createAdmin,
  createUser,
  ok,
  Tracker,
  type TestUser,
} from "./helpers";
import { GOOGLE_GOOD_CODE } from "./setup";

type Entry = {
  id: string;
  method: string;
  path: string;
  query: string | null;
  status: number;
  durationMs: number;
  userId: string | null;
  role: string | null;
  userEmail: string | null;
};

const t = new Tracker();
let admin: TestUser;
let buyer: TestUser;
const marker = `audit-${crypto.randomUUID().slice(0, 8)}`;

// Response hooks run just after the response; let them land, then write.
const settle = async () => {
  await Bun.sleep(30);
  await flushAuditLog();
};
const logOf = async (qs: string) =>
  ok<Entry[]>(await api("GET", `/audit/admin?${qs}`, { token: admin.token }));

beforeAll(async () => {
  process.env.AUDIT_LOG = "on";
  admin = await createAdmin(t);
  buyer = await createUser(t);
});
// A documentation-range IP (RFC 5737), unique per run, for the alert tests.
const attackerIp = `192.0.2.${Math.floor(Math.random() * 250) + 1}`;

afterAll(async () => {
  delete process.env.AUDIT_LOG;
  delete process.env.TRUST_PROXY;
  // This file's rows: its users' requests and its anonymous marker requests.
  const sql = postgres(Bun.env.DB_URL!, { max: 1, prepare: false });
  await sql`delete from request_logs where user_id in ${sql([admin.id, buyer.id])} or path like ${`%${marker}%`} or query like ${`%${marker}%`} or ip = ${attackerIp}`;
  await sql`delete from notifications where type = 'security_alert' and body like ${`%${attackerIp}%`}`;
  await sql.end();
  await t.cleanup();
});

describe("audit log", () => {
  test("records who made a request, what, the outcome and how long", async () => {
    ok(await api("GET", "/users/me", { token: buyer.token }));
    await settle();
    const [entry] = await logOf(`userId=${buyer.id}&path=/users/me`);
    expect(entry).toMatchObject({
      method: "GET",
      path: "/users/me",
      status: 200,
      userId: buyer.id,
      role: "buyer",
      userEmail: buyer.email,
    });
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("anonymous requests and errors are recorded too", async () => {
    await api("GET", `/products/by-slug/${marker}`);
    await settle();
    const [entry] = await logOf(`path=${marker}&status=4xx`);
    expect(entry).toMatchObject({ status: 404, userId: null });
  });

  test("secret query values are redacted", async () => {
    await api(
      "GET",
      `/auth/google/callback?code=${GOOGLE_GOOD_CODE}&note=${marker}`,
    );
    await settle();
    const [entry] = await logOf(
      `path=/auth/google/callback&since=${new Date(Date.now() - 60_000).toISOString()}`,
    );
    expect(entry.query).toContain("code=[redacted]");
    expect(entry.query).not.toContain(GOOGLE_GOOD_CODE);
    expect(redactQuery("?q=phones&cursor=abc")).toBe("q=phones&cursor=abc");
    expect(redactQuery("")).toBeNull();
  });

  test("filters by status, method and user, and pages", async () => {
    await api("GET", "/audit/admin", { token: buyer.token }); // 403, recorded
    await api("PATCH", "/users/me", {
      token: buyer.token,
      body: { name: "Audited" },
    });
    await settle();
    const denied = await logOf(`userId=${buyer.id}&status=403`);
    expect(denied.map((e) => e.path)).toContain("/audit/admin");
    const patches = await logOf(`userId=${buyer.id}&method=patch`);
    expect(patches.every((e) => e.method === "PATCH")).toBe(true);
    const byEmail = await logOf(`user=${encodeURIComponent(buyer.email)}`);
    expect(byEmail.every((e) => e.userId === buyer.id)).toBe(true);

    const first = await api("GET", `/audit/admin?userId=${buyer.id}&limit=1`, {
      token: admin.token,
    });
    expect(first.body.data).toHaveLength(1);
    expect(first.body.nextCursor).toBeTruthy();
  });

  test("is admin-only and validates filters", async () => {
    expect(
      (await api("GET", "/audit/admin", { token: buyer.token })).status,
    ).toBe(403);
    expect((await api("GET", "/audit/admin")).status).toBe(401);
    for (const qs of ["userId=nope", "method=TRACE", "since=not-a-date"])
      expect(
        (await api("GET", `/audit/admin?${qs}`, { token: admin.token })).status,
      ).toBe(400);
  });
});

describe("monitoring", () => {
  type Stats = {
    hours: number;
    totals: { requests: number; failedSignIns: number; p95Ms: number };
    hourly: { hour: string; total: number }[];
    routes: { method: string; route: string; requests: number }[];
    signIns: { ip: string; failedSignIns: number }[];
    alerts: { key: string; level: string }[];
  };

  test("repeated failed sign-ins from one IP raise an alert and notify admins once", async () => {
    process.env.TRUST_PROXY = "1";
    for (let i = 0; i < THRESHOLDS.failedSignInWarn; i++)
      await App.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": attackerIp,
          },
          body: JSON.stringify({
            email: `nobody.${marker}@test.soko.local`,
            password: "wrong-password",
          }),
        }),
      );
    await settle();

    const alerts = await evaluateAlerts();
    expect(alerts.map((a) => a.key)).toContain(`brute-force:${attackerIp}`);

    const sent = await notifyAdminsOfAlerts();
    expect(sent.map((a) => a.key)).toContain(`brute-force:${attackerIp}`);
    const notes = ok<{ type: string; body: string }[]>(
      await api("GET", "/notifications/me?limit=100", { token: admin.token }),
    );
    expect(
      notes.some(
        (n) => n.type === "security_alert" && n.body.includes(attackerIp),
      ),
    ).toBe(true);
    // Not again within the hour.
    const again = await notifyAdminsOfAlerts();
    expect(again.map((a) => a.key)).not.toContain(`brute-force:${attackerIp}`);
  });

  test("GET /audit/admin/stats: hourly traffic, top routes, failed sign-ins, alerts", async () => {
    const s = ok<Stats>(
      await api("GET", "/audit/admin/stats", { token: admin.token }),
    );
    expect(s.hours).toBe(24);
    expect(s.hourly).toHaveLength(24);
    expect(s.totals.requests).toBeGreaterThan(0);
    expect(s.hourly.at(-1)!.total).toBeGreaterThan(0);
    // Top routes depend on everything else in the log (the dev server writes
    // here too), so check their shape, not which ones made the cut.
    expect(s.routes.length).toBeGreaterThan(0);
    expect(s.routes[0]).toMatchObject({
      method: expect.any(String),
      route: expect.stringMatching(/^\//),
      requests: expect.any(Number),
    });
    expect(
      s.signIns.find((c) => c.ip === attackerIp)?.failedSignIns,
    ).toBeGreaterThanOrEqual(THRESHOLDS.failedSignInWarn);
    expect(s.alerts.map((a) => a.key)).toContain(`brute-force:${attackerIp}`);
    // Ids in paths are grouped into one route.
    expect(
      s.routes.every((r) => !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(r.route)),
    ).toBe(true);
  });

  test("other ranges; admin-only; validated", async () => {
    const week = ok<Stats>(
      await api("GET", "/audit/admin/stats?hours=168", { token: admin.token }),
    );
    expect(week.hourly).toHaveLength(168);
    expect(
      (await api("GET", "/audit/admin/stats?hours=5", { token: admin.token }))
        .status,
    ).toBe(400);
    expect(
      (await api("GET", "/audit/admin/stats", { token: buyer.token })).status,
    ).toBe(403);
  });
});
