import { getRepositories } from "../lib/repositories";
import type { HourlyTraffic } from "db-operations";

// Traffic monitoring over the audit log: requests per hour, latency, the
// busiest endpoints and clients, and alerts for patterns worth a look —
// server errors, slowness, traffic spikes, brute-force sign-ins, probing.

const HOUR = 3_600_000;

/** When each alert fires. Rates need a minimum volume to mean anything. */
export const THRESHOLDS = {
  minRequests: 20,
  serverErrorWarnPct: 1,
  serverErrorCritPct: 5,
  slowWarnMs: 2_000,
  slowCritMs: 5_000,
  /** Last hour vs. the previous 24 hours' hourly average. */
  spikeFactor: 3,
  spikeMinRequests: 300,
  failedSignInWarn: 8,
  failedSignInCrit: 20,
  deniedWarn: 30,
  notFoundWarn: 50,
  rateLimitedWarn: 50,
};

export type AlertLevel = "critical" | "warning";

export interface Alert {
  /** Stable id, e.g. "brute-force:41.90.1.2" — used to de-duplicate. */
  key: string;
  level: AlertLevel;
  title: string;
  detail: string;
}

const empty = (hour: string): HourlyTraffic => ({
  hour,
  total: 0,
  ok: 0,
  refused: 0,
  denied: 0,
  rateLimited: 0,
  serverErrors: 0,
  failedSignIns: 0,
  p50Ms: 0,
  p95Ms: 0,
  clients: 0,
});

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

/** Checks the last 60 minutes against the thresholds. */
export async function evaluateAlerts(now = new Date()): Promise<Alert[]> {
  const stats = getRepositories().requestLogStats;
  const since = new Date(now.getTime() - HOUR);
  const [buckets, baselineTotal, byRefused, bySignIns] = await Promise.all([
    stats.hourly(since),
    stats.countBetween(new Date(now.getTime() - 25 * HOUR), since),
    stats.clients(since, "refused", 20),
    stats.clients(since, "failed_sign_ins", 20),
  ]);
  // The window spans at most two hour buckets; p95 is approximated by the
  // worse of the two.
  const total = buckets.reduce((n, b) => n + b.total, 0);
  const serverErrors = buckets.reduce((n, b) => n + b.serverErrors, 0);
  const rateLimited = buckets.reduce((n, b) => n + b.rateLimited, 0);
  const p95 = Math.max(0, ...buckets.map((b) => b.p95Ms));
  const T = THRESHOLDS;
  const alerts: Alert[] = [];

  if (total >= T.minRequests) {
    const rate = pct(serverErrors, total);
    if (rate >= T.serverErrorWarnPct && serverErrors >= 3)
      alerts.push({
        key: "server-errors",
        level: rate >= T.serverErrorCritPct ? "critical" : "warning",
        title: "Server errors",
        detail: `${serverErrors} of ${total} requests (${rate}%) failed with a 5xx in the last hour.`,
      });
    if (p95 >= T.slowWarnMs)
      alerts.push({
        key: "slow",
        level: p95 >= T.slowCritMs ? "critical" : "warning",
        title: "Slow responses",
        detail: `95% of requests took up to ${p95} ms in the last hour.`,
      });
  }

  const baseline = baselineTotal / 24;
  if (
    total >= T.spikeMinRequests &&
    baseline > 0 &&
    total >= baseline * T.spikeFactor
  )
    alerts.push({
      key: "traffic-spike",
      level: "warning",
      title: "Traffic spike",
      // A quiet site's usual rate can be a fraction of a request an hour.
      detail: `${total} requests in the last hour — ${Math.round(total / baseline)}× the usual ${baseline < 1 ? "(under 1 an hour)" : `${Math.round(baseline)} an hour`}.`,
    });

  if (rateLimited >= T.rateLimitedWarn)
    alerts.push({
      key: "rate-limited",
      level: "warning",
      title: "Clients hitting rate limits",
      detail: `${rateLimited} requests were turned away (429) in the last hour.`,
    });

  for (const c of bySignIns)
    if (c.failedSignIns >= T.failedSignInWarn)
      alerts.push({
        key: `brute-force:${c.ip}`,
        level: c.failedSignIns >= T.failedSignInCrit ? "critical" : "warning",
        title: "Repeated failed sign-ins",
        detail: `${c.failedSignIns} failed sign-ins from ${c.ip} in the last hour — possible password guessing.`,
      });

  for (const c of byRefused) {
    if (c.denied >= T.deniedWarn)
      alerts.push({
        key: `denied:${c.ip}`,
        level: "warning",
        title: "Access denied repeatedly",
        detail: `${c.ip} was refused access ${c.denied} times (401/403) in the last hour — possible probing of protected endpoints.`,
      });
    if (c.notFound >= T.notFoundWarn)
      alerts.push({
        key: `scanning:${c.ip}`,
        level: "warning",
        title: "Possible scanning",
        detail: `${c.ip} requested ${c.notFound} missing paths (404) in the last hour.`,
      });
  }

  return alerts.sort((a, b) =>
    a.level === b.level ? 0 : a.level === "critical" ? -1 : 1,
  );
}

/** The monitoring dashboard: the last `hours` hours, hour by hour. */
export async function getMonitoring(hours: number) {
  const stats = getRepositories().requestLogStats;
  const now = new Date();
  const thisHour = Math.floor(now.getTime() / HOUR) * HOUR;
  const since = new Date(thisHour - (hours - 1) * HOUR);
  const prevSince = new Date(since.getTime() - hours * HOUR);

  const [rows, previousTotal, routes, clients, signIns, alerts] =
    await Promise.all([
      stats.hourly(since),
      stats.countBetween(prevSince, since),
      stats.topRoutes(since),
      stats.clients(since, "requests"),
      stats.clients(since, "failed_sign_ins"),
      evaluateAlerts(now),
    ]);

  // Every hour in the window, including quiet ones.
  const byHour = new Map(rows.map((r) => [r.hour, r]));
  const hourly: HourlyTraffic[] = [];
  for (let t = since.getTime(); t <= thisHour; t += HOUR) {
    const key = new Date(t).toISOString().replace(/:\d\d\.\d{3}Z$/, ":00Z");
    hourly.push(byHour.get(key) ?? empty(key));
  }

  const sum = (k: keyof HourlyTraffic) =>
    hourly.reduce((n, h) => n + Number(h[k]), 0);
  const total = sum("total");
  return {
    hours,
    from: since.toISOString(),
    totals: {
      requests: total,
      previousRequests: previousTotal,
      ok: sum("ok"),
      refused: sum("refused"),
      denied: sum("denied"),
      rateLimited: sum("rateLimited"),
      serverErrors: sum("serverErrors"),
      failedSignIns: sum("failedSignIns"),
      serverErrorRate: pct(sum("serverErrors"), total),
      /** Worst hourly p95 in the window. */
      p95Ms: Math.max(0, ...hourly.map((h) => h.p95Ms)),
      peakHourRequests: Math.max(0, ...hourly.map((h) => h.total)),
    },
    hourly,
    routes,
    clients,
    signIns: signIns.filter((c) => c.failedSignIns > 0),
    alerts,
    thresholds: THRESHOLDS,
  };
}

// ─── Alert notifications ─────────────────────────────────────────────────────

const CHECK_EVERY_MS = 5 * 60_000;
const RENOTIFY_AFTER_MS = HOUR;
const lastNotified = new Map<string, number>();

/** Notifies every admin about alerts they haven't heard about this hour. */
export async function notifyAdminsOfAlerts(now = Date.now()) {
  const alerts = await evaluateAlerts(new Date(now));
  const fresh = alerts.filter(
    (a) => now - (lastNotified.get(a.key) ?? 0) >= RENOTIFY_AFTER_MS,
  );
  if (fresh.length === 0) return [];
  const { userRepository, notificationRepository } = getRepositories();
  const admins = await userRepository.findAdminIds();
  for (const a of fresh) {
    lastNotified.set(a.key, now);
    await Promise.all(
      admins.map((userId) =>
        notificationRepository.insertNotification({
          userId,
          type: "security_alert",
          title: `${a.level === "critical" ? "Critical" : "Warning"}: ${a.title}`,
          body: a.detail,
          channel: "push",
        }),
      ),
    );
  }
  return fresh;
}

/** Checks for alerts every few minutes (the API process calls this once). */
export function startAlertWatch() {
  if (Bun.env.NODE_ENV === "test" || Bun.env.AUDIT_LOG === "off") return;
  setInterval(() => {
    notifyAdminsOfAlerts().catch((err) =>
      console.error("Alert watch failed", err),
    );
  }, CHECK_EVERY_MS).unref();
}
