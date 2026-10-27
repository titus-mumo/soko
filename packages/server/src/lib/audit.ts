import Elysia from "elysia";
import type { NewRequestLog } from "db-operations";
import { getRepositories } from "./repositories";
import { verifyAccessToken } from "./jwt";
import { clientIp } from "./rate-limit";

// The admin audit log: one row per API request — who (user, role, IP),
// what (method, path, redacted query), the outcome (status) and how long it
// took. Bodies are never recorded.
//
// Rows are queued in memory and written in batches, so logging never adds a
// database round trip to a request. Old rows are pruned daily.

const FLUSH_EVERY_MS = 2_000;
const FLUSH_AT = 100;
/** If the database is unreachable, drop rather than grow without bound. */
const MAX_QUEUE = 5_000;
const DAY = 86_400_000;
const retentionDays = () => Number(Bun.env.AUDIT_RETENTION_DAYS) || 90;
// Off in the test suite (the audit tests switch it on); read per request.
const enabled = () =>
  (Bun.env.AUDIT_LOG ?? (Bun.env.NODE_ENV === "test" ? "off" : "on")) !== "off";

// Query parameters whose values are secrets (OAuth codes, tokens, …).
const SECRET_PARAM = /code|token|secret|password|otp|state|key|signature/i;

/** The query string with secret values replaced, or null when empty. */
export function redactQuery(search: string): string | null {
  const params = new URLSearchParams(search);
  if ([...params.keys()].length === 0) return null;
  for (const key of new Set(params.keys()))
    if (SECRET_PARAM.test(key)) params.set(key, "[redacted]");
  return decodeURIComponent(params.toString()).slice(0, 500);
}

let queue: NewRequestLog[] = [];
let flushing: Promise<void> | null = null;

/** Writes everything queued so far. Safe to call any time (tests do). */
export async function flushAuditLog(): Promise<void> {
  if (flushing) await flushing;
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  flushing = getRepositories()
    .requestLogRepository.insertMany(batch)
    .catch((err) => {
      console.error("Audit log: failed to write a batch", err);
    })
    .finally(() => {
      flushing = null;
    });
  await flushing;
}

function record(row: NewRequestLog) {
  if (queue.length >= MAX_QUEUE) return;
  queue.push(row);
  if (queue.length >= FLUSH_AT) void flushAuditLog();
}

// Background flush and daily pruning; unref'd so they never keep the
// process alive on their own.
if (Bun.env.NODE_ENV !== "test") {
  setInterval(() => void flushAuditLog(), FLUSH_EVERY_MS).unref();
  const prune = () =>
    getRepositories()
      .requestLogRepository.pruneOlderThan(retentionDays())
      .catch((err) => console.error("Audit log: prune failed", err));
  setTimeout(prune, 60_000).unref();
  setInterval(prune, DAY).unref();
}

const startedAt = new WeakMap<Request, number>();

async function whoIs(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return await verifyAccessToken(auth.slice(7)).catch(() => null);
}

export const auditLog = new Elysia({ name: "audit-log" })
  .onRequest(({ request }) => {
    startedAt.set(request, performance.now());
  })
  .onAfterResponse({ as: "global" }, async ({ request, set, server }) => {
    if (!enabled() || request.method === "OPTIONS") return;
    const start = startedAt.get(request);
    const url = new URL(request.url);
    const who = await whoIs(request);
    const status = Number(set.status) || 200;
    record({
      method: request.method,
      path: url.pathname.slice(0, 500),
      query: redactQuery(url.search),
      status,
      durationMs:
        start === undefined ? 0 : Math.round(performance.now() - start),
      userId: (who?.userId as string | undefined) ?? null,
      role: (who?.role as string | undefined) ?? null,
      ip: clientIp(request, server).slice(0, 64),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
  });
