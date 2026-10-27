import { db } from "src/db";
import { requestLogsTable, usersTable } from "src/schema";
import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import {
  clampLimit,
  decodeCursor,
  encodeCursor,
  toPage,
  type Page,
  type PageParams,
} from "../../pagination";

export type RequestLog = typeof requestLogsTable.$inferSelect;
export type NewRequestLog = typeof requestLogsTable.$inferInsert;

/** A log entry for the admin view, with who made the request. */
export type RequestLogEntry = RequestLog & {
  userName: string | null;
  userEmail: string | null;
};

export interface RequestLogFilter {
  userId?: string;
  method?: string;
  /** "2xx", "4xx", "5xx" or an exact code like "401". */
  status?: string;
  /** Substring of the path. */
  path?: string;
  /** Substring of the user's email or name. */
  user?: string;
  /** Exact client IP. */
  ip?: string;
  since?: Date;
}

const likeEscape = (s: string) => s.replace(/[\%_]/g, (c) => `\${c}`);

export class RequestLogRepository {
  /** Inserts a batch of entries in one statement. */
  async insertMany(rows: NewRequestLog[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(requestLogsTable).values(rows);
  }

  /** Newest first, filtered, a page at a time (keyset on createdAt, id). */
  async page(
    filter: RequestLogFilter,
    params: PageParams = {},
  ): Promise<Page<RequestLogEntry>> {
    const t = requestLogsTable;
    const limit = clampLimit(params.limit);
    const after = decodeCursor(params.cursor);
    const where: (SQL | undefined)[] = [
      filter.userId ? eq(t.userId, filter.userId) : undefined,
      filter.method ? eq(t.method, filter.method.toUpperCase()) : undefined,
      filter.ip ? eq(t.ip, filter.ip.slice(0, 64)) : undefined,
      filter.since ? gte(t.createdAt, filter.since) : undefined,
      filter.path
        ? ilike(t.path, `%${likeEscape(filter.path.slice(0, 200))}%`)
        : undefined,
      filter.user
        ? or(
            ilike(
              usersTable.email,
              `%${likeEscape(filter.user.slice(0, 100))}%`,
            ),
            ilike(
              usersTable.name,
              `%${likeEscape(filter.user.slice(0, 100))}%`,
            ),
          )
        : undefined,
    ];
    const status = filter.status?.trim();
    if (status && /^[1-5]xx$/i.test(status)) {
      const base = Number(status[0]) * 100;
      where.push(sql`${t.status} >= ${base} and ${t.status} < ${base + 100}`);
    } else if (status && /^\d{3}$/.test(status)) {
      where.push(eq(t.status, Number(status)));
    }
    if (after) {
      where.push(
        or(
          lt(t.createdAt, new Date(after[0])),
          and(eq(t.createdAt, new Date(after[0])), lt(t.id, after[1])),
        ),
      );
    }

    const rows = await db
      .select({
        id: t.id,
        createdAt: t.createdAt,
        method: t.method,
        path: t.path,
        query: t.query,
        status: t.status,
        durationMs: t.durationMs,
        userId: t.userId,
        role: t.role,
        ip: t.ip,
        userAgent: t.userAgent,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(t)
      .leftJoin(usersTable, eq(usersTable.id, t.userId))
      .where(and(...where))
      .orderBy(desc(t.createdAt), desc(t.id))
      .limit(limit + 1);

    return toPage(rows, limit, (r) => encodeCursor(r.createdAt, r.id));
  }

  /** Deletes entries older than `days`. Returns how many went. */
  async pruneOlderThan(days: number): Promise<number> {
    const res = await db
      .delete(requestLogsTable)
      .where(
        lt(
          requestLogsTable.createdAt,
          sql`now() - make_interval(days => ${days})`,
        ),
      )
      .returning({ id: requestLogsTable.id });
    return res.length;
  }
}

// ─── Monitoring aggregates ───────────────────────────────────────────────────

/** Requests per hour, by outcome, with latency percentiles. */
export interface HourlyTraffic {
  hour: string;
  total: number;
  /** 1xx–3xx */
  ok: number;
  /** 4xx (includes denied, not found, rate-limited) */
  refused: number;
  /** 401 + 403 */
  denied: number;
  rateLimited: number;
  serverErrors: number;
  /** Refused POSTs to the sign-in endpoints. */
  failedSignIns: number;
  p50Ms: number;
  p95Ms: number;
  /** Distinct users (or IPs, when signed out). */
  clients: number;
}

export interface RouteStats {
  method: string;
  /** Path with ids replaced by ":id". */
  route: string;
  requests: number;
  refused: number;
  serverErrors: number;
  p95Ms: number;
}

export interface ClientStats {
  ip: string;
  requests: number;
  refused: number;
  denied: number;
  notFound: number;
  rateLimited: number;
  failedSignIns: number;
  users: number;
}

const SIGN_IN = sql`(method = 'POST' and path in ('/auth/login', '/auth/otp/verify') and status >= 400 and status <> 429)`;
const ROUTE = sql`regexp_replace(path, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', ':id', 'g')`;

export class RequestLogStats {
  /** Hour buckets since `since` (only hours with traffic; the caller fills gaps). */
  async hourly(since: Date): Promise<HourlyTraffic[]> {
    const rows = await db.execute(sql`
      select to_char(date_trunc('hour', created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:00:00"Z"') as hour,
        count(*)::int as total,
        count(*) filter (where status < 400)::int as ok,
        count(*) filter (where status between 400 and 499)::int as refused,
        count(*) filter (where status in (401, 403))::int as denied,
        count(*) filter (where status = 429)::int as rate_limited,
        count(*) filter (where status >= 500)::int as server_errors,
        count(*) filter (where ${SIGN_IN})::int as failed_sign_ins,
        coalesce(percentile_cont(0.5) within group (order by duration_ms), 0)::int as p50,
        coalesce(percentile_cont(0.95) within group (order by duration_ms), 0)::int as p95,
        count(distinct coalesce(user_id::text, ip))::int as clients
      from request_logs
      where created_at >= ${since.toISOString()}::timestamptz
      group by 1 order by 1`);
    return (rows as unknown as Record<string, unknown>[]).map((r) => ({
      hour: String(r.hour),
      total: Number(r.total),
      ok: Number(r.ok),
      refused: Number(r.refused),
      denied: Number(r.denied),
      rateLimited: Number(r.rate_limited),
      serverErrors: Number(r.server_errors),
      failedSignIns: Number(r.failed_sign_ins),
      p50Ms: Number(r.p50),
      p95Ms: Number(r.p95),
      clients: Number(r.clients),
    }));
  }

  /** Busiest endpoints since `since`. */
  async topRoutes(since: Date, limit = 10): Promise<RouteStats[]> {
    const rows = await db.execute(sql`
      select method, ${ROUTE} as route,
        count(*)::int as requests,
        count(*) filter (where status between 400 and 499)::int as refused,
        count(*) filter (where status >= 500)::int as server_errors,
        coalesce(percentile_cont(0.95) within group (order by duration_ms), 0)::int as p95
      from request_logs
      where created_at >= ${since.toISOString()}::timestamptz
      group by 1, 2 order by requests desc limit ${limit}`);
    return (rows as unknown as Record<string, unknown>[]).map((r) => ({
      method: String(r.method),
      route: String(r.route),
      requests: Number(r.requests),
      refused: Number(r.refused),
      serverErrors: Number(r.server_errors),
      p95Ms: Number(r.p95),
    }));
  }

  /**
   * Clients (by IP) since `since`, ordered by `orderBy` — busiest, most
   * refused, or most failed sign-ins.
   */
  async clients(
    since: Date,
    orderBy: "requests" | "refused" | "failed_sign_ins" = "requests",
    limit = 10,
  ): Promise<ClientStats[]> {
    const order = sql.raw(orderBy);
    const rows = await db.execute(sql`
      select coalesce(ip, 'unknown') as ip,
        count(*)::int as requests,
        count(*) filter (where status between 400 and 499)::int as refused,
        count(*) filter (where status in (401, 403))::int as denied,
        count(*) filter (where status = 404)::int as not_found,
        count(*) filter (where status = 429)::int as rate_limited,
        count(*) filter (where ${SIGN_IN})::int as failed_sign_ins,
        count(distinct user_id)::int as users
      from request_logs
      where created_at >= ${since.toISOString()}::timestamptz
      group by 1 order by ${order} desc, requests desc limit ${limit}`);
    return (rows as unknown as Record<string, unknown>[]).map((r) => ({
      ip: String(r.ip),
      requests: Number(r.requests),
      refused: Number(r.refused),
      denied: Number(r.denied),
      notFound: Number(r.not_found),
      rateLimited: Number(r.rate_limited),
      failedSignIns: Number(r.failed_sign_ins),
      users: Number(r.users),
    }));
  }

  /** Requests between two instants (for the traffic baseline). */
  async countBetween(from: Date, to: Date): Promise<number> {
    const [row] = (await db.execute(sql`
      select count(*)::int as n from request_logs
      where created_at >= ${from.toISOString()}::timestamptz and created_at < ${to.toISOString()}::timestamptz`)) as unknown as {
      n: number;
    }[];
    return Number(row?.n ?? 0);
  }
}
