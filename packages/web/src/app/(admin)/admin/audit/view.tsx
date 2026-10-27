"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuditLog, type AuditEntry } from "@/lib/admin.api";
import { usePagedList } from "@/hooks/usePagedList";
import { LoadMore } from "@/components/ui/LoadMore";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { relativeTime } from "@/lib/utils";

type StatusTab = "all" | "2xx" | "4xx" | "5xx";
const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "2xx", label: "Succeeded" },
  { value: "4xx", label: "Refused" },
  { value: "5xx", label: "Server errors" },
];
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 50;

const statusTone = (s: number): BadgeTone =>
  s >= 500 ? "error" : s >= 400 ? "warning" : s >= 300 ? "info" : "success";

/** Text filters update as you type, without a request per keystroke. */
function useDebounced(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);
  return debounced;
}

export default function AdminAuditPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense>
      <AuditLog />
    </Suspense>
  );
}

/** Every API request: who made it, what it was, and how it went. */
function AuditLog() {
  const router = useRouter();
  // ?ip= narrows to one client (linked from the monitoring page).
  const ip = useSearchParams().get("ip") ?? undefined;
  const [status, setStatus] = useState<StatusTab>("all");
  const [method, setMethod] = useState("");
  const [pathInput, setPathInput] = useState("");
  const [userInput, setUserInput] = useState("");
  // Clicking a user narrows the log to exactly them.
  const [onlyUser, setOnlyUser] = useState<{ id: string; label: string }>();
  const path = useDebounced(pathInput);
  const user = useDebounced(userInput);

  const list = usePagedList(
    (page) =>
      getAuditLog(
        {
          status: status === "all" ? undefined : status,
          method: method || undefined,
          path: path || undefined,
          user: onlyUser ? undefined : user || undefined,
          userId: onlyUser?.id,
          ip,
        },
        page,
      ),
    [status, method, path, user, onlyUser?.id, ip],
    { pageSize: PAGE_SIZE, errorMessage: "Couldn't load the audit log" },
  );

  const filtered = Boolean(
    status !== "all" || method || path || user || onlyUser || ip,
  );
  const clearFilters = () => {
    setStatus("all");
    setMethod("");
    setPathInput("");
    setUserInput("");
    setOnlyUser(undefined);
    if (ip) router.replace("/admin/audit");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every API request: who made it, what it was, and how it went. Request bodies are never recorded."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => list.reload()}
            isLoading={list.loading}
          >
            <Icon name="refresh" size={14} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-3">
        {ip && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-600/40 bg-brand-600/[0.06] px-3 py-2 text-sm">
            <span>
              Only requests from <span className="font-mono">{ip}</span>
            </span>
            <button
              type="button"
              onClick={() => router.replace("/admin/audit")}
              aria-label="Show all IPs"
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
        <FilterChips
          label="Filter by outcome"
          value={status}
          onChange={setStatus}
          options={STATUS_TABS}
        />
        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
          <Select
            id="audit-method"
            label="Method"
            hideLabel
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="">All methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Input
            id="audit-path"
            label="Path contains"
            hideLabel
            prefix={<Icon name="search" />}
            placeholder="Path, e.g. /orders"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
          />
          {onlyUser ? (
            <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-brand-600/40 bg-brand-600/[0.06] px-3 text-sm">
              <span className="truncate">
                Only <span className="font-medium">{onlyUser.label}</span>
              </span>
              <button
                type="button"
                onClick={() => setOnlyUser(undefined)}
                aria-label="Show all users"
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ) : (
            <Input
              id="audit-user"
              label="User"
              hideLabel
              prefix={<Icon name="user" />}
              placeholder="User email or name"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
          )}
        </div>
      </div>

      {list.error && list.items.length === 0 ? (
        <ErrorState
          title="Couldn't load the audit log"
          message={list.error}
          onRetry={() => list.reload()}
        />
      ) : !list.loading && list.items.length === 0 ? (
        <EmptyState
          icon="search"
          title={filtered ? "No requests match" : "No requests yet"}
          description={
            filtered
              ? "Try a broader filter."
              : "Requests appear here within a few seconds."
          }
          action={
            filtered ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
          compact
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                {["When", "User", "Request", "Status", "Time", "IP"].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {list.loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} aria-hidden="true">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-20 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : list.items.map((e) => (
                    <AuditRow
                      key={e.id}
                      entry={e}
                      onUser={(id, label) => setOnlyUser({ id, label })}
                    />
                  ))}
            </tbody>
          </table>
        </div>
      )}

      <LoadMore
        hasMore={list.hasMore}
        loading={list.loadingMore}
        onLoadMore={list.loadMore}
        label={`Show ${PAGE_SIZE} more`}
      />
    </div>
  );
}

function AuditRow({
  entry: e,
  onUser,
}: {
  entry: AuditEntry;
  onUser: (id: string, label: string) => void;
}) {
  const who = e.userEmail ?? e.userName;
  return (
    <tr className="align-top">
      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
        <time
          dateTime={e.createdAt}
          title={new Date(e.createdAt).toLocaleString("en-KE")}
        >
          {relativeTime(e.createdAt)}
        </time>
      </td>
      <td className="max-w-[14rem] px-4 py-3">
        {e.userId ? (
          <button
            type="button"
            onClick={() => onUser(e.userId!, who ?? e.userId!)}
            className="block max-w-full truncate text-left text-zinc-800 hover:underline dark:text-zinc-200"
            title={`Show only ${who ?? "this user"}`}
          >
            {who ?? "Deleted user"}
          </button>
        ) : (
          <span className="text-zinc-400">Guest</span>
        )}
        {e.role === "admin" && (
          <Badge tone="purple" size="sm" className="mt-1">
            Admin
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
          <span className="font-semibold">{e.method}</span>{" "}
          <span className="break-all">
            {e.path}
            {e.query && <span className="text-zinc-500">?{e.query}</span>}
          </span>
        </p>
        {e.userAgent && (
          <p
            className="mt-0.5 max-w-md truncate text-2xs text-zinc-400"
            title={e.userAgent}
          >
            {e.userAgent}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={statusTone(e.status)} size="sm">
          {e.status}
        </Badge>
      </td>
      <td className="tabular whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {e.durationMs} ms
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-500">
        {e.ip ?? "—"}
      </td>
    </tr>
  );
}
