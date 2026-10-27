import Elysia from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import { flushAuditLog } from "../../lib/audit";
import { getRepositories } from "../../lib/repositories";
import { pageParams, paged } from "../../lib/paging";
import { getMonitoring } from "../../services/monitoring.service";

const UUID = /^[0-9a-f-]{36}$/i;
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Admin — the audit log of API requests, newest first. Filters: userId,
// method, status ("4xx" or "404"), path / user (substring), since (ISO date).
const GetAuditLog = new Elysia().use(adminPlugin).get("/admin", async (ctx) => {
  const { query, set } = ctx as any;
  const q = query ?? {};
  if (q.userId && !UUID.test(q.userId)) {
    set.status = 400;
    return { success: false, message: "Invalid user id." };
  }
  if (q.method && !METHODS.includes(String(q.method).toUpperCase())) {
    set.status = 400;
    return { success: false, message: "Unknown method." };
  }
  const since = q.since ? new Date(q.since) : undefined;
  if (since && Number.isNaN(since.getTime())) {
    set.status = 400;
    return { success: false, message: "Invalid date." };
  }
  // Include what's still queued, so the newest requests show up.
  await flushAuditLog();
  return paged(
    await getRepositories().requestLogRepository.page(
      {
        userId: q.userId,
        method: q.method,
        status: q.status,
        path: q.path,
        user: q.user,
        ip: q.ip,
        since,
      },
      pageParams(q),
    ),
  );
});

const RANGES = [24, 72, 168];

// Admin — traffic per hour, latency, busiest endpoints and clients, and any
// alerts. ?hours=24 (default), 72 or 168.
const GetMonitoring = new Elysia()
  .use(adminPlugin)
  .get("/admin/stats", async (ctx) => {
    const { query, set } = ctx as any;
    const hours = Number(query?.hours ?? 24);
    if (!RANGES.includes(hours)) {
      set.status = 400;
      return { success: false, message: "hours must be 24, 72 or 168." };
    }
    await flushAuditLog();
    return { success: true, data: await getMonitoring(hours) };
  });

export const auditRoutes = new Elysia().group("/audit", (app) =>
  app.use(GetMonitoring).use(GetAuditLog),
);
