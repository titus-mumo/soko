"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getMonitoring,
  type Monitoring,
  type MonitoringAlert,
} from "@/lib/admin.api";
import {
  LineChart,
  StackedColumnChart,
  StatTile,
} from "@/components/charts/Charts";
import { compact } from "@/components/charts/chart-utils";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiErrorMessage, cn } from "@/lib/utils";

type Range = "24" | "72" | "168";
const RANGES: { value: Range; label: string }[] = [
  { value: "24", label: "Last 24 hours" },
  { value: "72", label: "Last 3 days" },
  { value: "168", label: "Last 7 days" },
];
const REFRESH_MS = 60_000;

const ms = (n: number) => `${compact(n)} ms`;
const pctChange = (now: number, before: number) =>
  before > 0 ? Math.round(((now - before) / before) * 100) : null;

/** Traffic per hour, errors, latency, busy clients and alerts. */
export default function AdminMonitoringPage() {
  const [range, setRange] = useState<Range>("24");
  const [data, setData] = useState<Monitoring | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await getMonitoring(Number(range)));
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load monitoring data"));
    } finally {
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const t = data?.totals;
  const change = t ? pctChange(t.requests, t.previousRequests) : null;
  const rangeLabel = RANGES.find((r) => r.value === range)!.label.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        description="Requests per hour, errors, latency and anything that looks like trouble. Updates every minute."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={load}
            isLoading={refreshing}
          >
            <Icon name="refresh" size={14} />
            Refresh
          </Button>
        }
      />

      {/* One filter row; it scopes everything below. */}
      <FilterChips
        label="Time range"
        value={range}
        onChange={setRange}
        options={RANGES}
      />

      {error && !data ? (
        <ErrorState
          title="Couldn't load monitoring data"
          message={error}
          onRetry={load}
        />
      ) : !data || !t ? (
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-20 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        // While refetching, keep the frame and dim it — no layout jump.
        <div
          className={cn(
            "space-y-6 transition-opacity",
            refreshing && "opacity-70",
          )}
        >
          <Alerts alerts={data.alerts} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Requests"
              value={t.requests.toLocaleString("en-KE")}
              note={
                change === null
                  ? `Peak ${compact(t.peakHourRequests)} in one hour`
                  : `${change >= 0 ? "+" : ""}${change}% vs the previous period`
              }
            />
            <StatTile
              label="Server error rate"
              value={`${t.serverErrorRate}%`}
              note={`${t.serverErrors.toLocaleString("en-KE")} requests failed (5xx)`}
              tone={
                t.serverErrorRate >= 5
                  ? "critical"
                  : t.serverErrorRate >= 1
                    ? "warning"
                    : "default"
              }
            />
            <StatTile
              label="Slowest hour (p95)"
              value={ms(t.p95Ms)}
              note="95% of requests in the worst hour were at least this fast"
              tone={
                t.p95Ms >= 5000
                  ? "critical"
                  : t.p95Ms >= 2000
                    ? "warning"
                    : "default"
              }
            />
            <StatTile
              label="Failed sign-ins"
              value={t.failedSignIns.toLocaleString("en-KE")}
              note={`${t.denied.toLocaleString("en-KE")} access denied · ${t.rateLimited.toLocaleString("en-KE")} rate-limited`}
            />
          </div>

          <StackedColumnChart
            title="Requests per hour"
            description={`By outcome, ${rangeLabel}. Hover a column for the breakdown.`}
            rows={data.hourly}
            series={[
              { key: "ok", label: "Succeeded", color: "var(--viz-series-1)" },
              {
                key: "refused",
                label: "Refused (4xx)",
                color: "var(--viz-serious)",
              },
              {
                key: "serverErrors",
                label: "Server errors (5xx)",
                color: "var(--viz-critical)",
              },
            ]}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <LineChart
              title="Response time"
              description="Median and 95th percentile per hour."
              rows={data.hourly}
              format={ms}
              series={[
                { key: "p50Ms", label: "Median", color: "var(--viz-series-1)" },
                {
                  key: "p95Ms",
                  label: "95th percentile",
                  color: "var(--viz-series-2)",
                },
              ]}
            />
            <LineChart
              title="Security signals"
              description="Failed sign-ins, access denied (401/403) and rate-limited (429) requests per hour."
              rows={data.hourly}
              series={[
                {
                  key: "failedSignIns",
                  label: "Failed sign-ins",
                  color: "var(--viz-series-1)",
                },
                {
                  key: "denied",
                  label: "Access denied",
                  color: "var(--viz-series-2)",
                },
                {
                  key: "rateLimited",
                  label: "Rate-limited",
                  color: "var(--viz-series-3)",
                },
              ]}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Table
              title="Busiest endpoints"
              empty="No requests in this period."
              head={["Endpoint", "Requests", "Refused", "5xx", "p95"]}
              rows={data.routes.map((r) => [
                <span key="e" className="font-mono text-xs">
                  <span className="font-semibold">{r.method}</span> {r.route}
                </span>,
                r.requests.toLocaleString("en-KE"),
                r.refused.toLocaleString("en-KE"),
                <span
                  key="s"
                  className={cn(
                    r.serverErrors > 0 &&
                      "font-semibold text-red-600 dark:text-red-400",
                  )}
                >
                  {r.serverErrors.toLocaleString("en-KE")}
                </span>,
                ms(r.p95Ms),
              ])}
            />
            <Table
              title="Most active clients"
              empty="No requests in this period."
              head={["IP", "Requests", "Refused", "404s", "Users"]}
              rows={data.clients.map((c) => [
                <IpLink key="ip" ip={c.ip} />,
                c.requests.toLocaleString("en-KE"),
                c.refused.toLocaleString("en-KE"),
                c.notFound.toLocaleString("en-KE"),
                c.users.toLocaleString("en-KE"),
              ])}
            />
          </div>

          <Table
            title="Failed sign-ins by IP"
            empty="No failed sign-ins in this period."
            head={[
              "IP",
              "Failed sign-ins",
              "Access denied",
              "Rate-limited",
              "Requests",
            ]}
            rows={data.signIns.map((c) => [
              <IpLink key="ip" ip={c.ip} />,
              <span
                key="f"
                className={cn(
                  c.failedSignIns >= 8 &&
                    "font-semibold text-red-600 dark:text-red-400",
                )}
              >
                {c.failedSignIns.toLocaleString("en-KE")}
              </span>,
              c.denied.toLocaleString("en-KE"),
              c.rateLimited.toLocaleString("en-KE"),
              c.requests.toLocaleString("en-KE"),
            ])}
          />
        </div>
      )}
    </div>
  );
}

function Alerts({ alerts }: { alerts: MonitoringAlert[] }) {
  if (alerts.length === 0)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-300/60 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
        <Icon name="check" />
        <span>
          <span className="font-medium">All clear.</span> Nothing unusual in the
          last hour.
        </span>
      </div>
    );
  return (
    <section aria-labelledby="alerts-title" className="space-y-2">
      <h2
        id="alerts-title"
        className="font-sans text-sm font-semibold tracking-normal text-zinc-900 dark:text-zinc-100"
      >
        Alerts <span className="font-normal text-zinc-500">· last hour</span>
      </h2>
      <ul className="space-y-2">
        {alerts.map((a) => (
          <li
            key={a.key}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              a.level === "critical"
                ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                : "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10",
            )}
          >
            <span
              className={cn(
                "mt-0.5 shrink-0",
                a.level === "critical"
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
            >
              <Icon name="alert" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide">
                  {a.level === "critical" ? "Critical" : "Warning"}
                </span>
                {a.title}
              </p>
              <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                {a.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Opens the audit log filtered to this IP's requests. */
function IpLink({ ip }: { ip: string }) {
  return (
    <Link
      href={`/admin/audit?ip=${encodeURIComponent(ip)}`}
      className="font-mono text-xs text-zinc-800 hover:underline dark:text-zinc-200"
    >
      {ip}
    </Link>
  );
}

function Table({
  title,
  head,
  rows,
  empty,
}: {
  title: string;
  head: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="border-b border-zinc-100 px-4 py-3 font-sans text-sm font-semibold tracking-normal text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                {head.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(
                      "px-4 py-2 font-medium",
                      i === 0 ? "text-left" : "text-right",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        "px-4 py-2",
                        j === 0
                          ? "text-left"
                          : "tabular text-right font-mono text-xs text-zinc-700 dark:text-zinc-300",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
