"use client";

import { useEffect, useState } from "react";
import {
  getDisputesByStatus,
  reviewDispute,
  resolveDispute,
  closeDispute,
  type Dispute,
  type DisputeStatus,
} from "@/lib/admin.api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const TABS: DisputeStatus[] = ["open", "under_review", "resolved", "closed"];

const tabLabel: Record<DisputeStatus, string> = {
  open: "Open",
  under_review: "Under review",
  resolved: "Resolved",
  closed: "Closed",
};

function ResolveModal({
  dispute,
  onDone,
  onClose,
}: {
  dispute: Dispute;
  onDone: () => void;
  onClose: () => void;
}) {
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolution.length < 10) {
      setError("Resolution must be at least 10 characters.");
      return;
    }
    setSaving(true);
    try {
      await resolveDispute(dispute.id, resolution);
      onDone();
      onClose();
    } catch {
      setError("Failed to resolve dispute.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">
          Resolve dispute
        </h2>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          {dispute.reason}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={4}
            placeholder="Enter resolution (min 10 characters)…"
            className="w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Resolve"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const [tab, setTab] = useState<DisputeStatus>("open");
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Dispute | null>(null);

  const load = () => {
    setLoading(true);
    return getDisputesByStatus(tab)
      .then(setDisputes)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReview = async (disputeId: string) => {
    setBusy(disputeId);
    await reviewDispute(disputeId).catch(() => {});
    await load();
    setBusy(null);
  };

  const handleClose = async (disputeId: string) => {
    if (!confirm("Close this dispute?")) return;
    setBusy(disputeId);
    await closeDispute(disputeId).catch(() => {});
    await load();
    setBusy(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Disputes
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage buyer disputes by status
        </p>
      </div>

      <div className="flex gap-1">
        {TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === s
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {tabLabel[s]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))
        ) : disputes.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
            No {tabLabel[tab].toLowerCase()} disputes
          </p>
        ) : (
          disputes.map((d) => (
            <div
              key={d.id}
              className="rounded-md border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      #{d.id.slice(-8).toUpperCase()}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      Order {d.orderId.slice(-8).toUpperCase()}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {d.reason}
                  </p>
                  {d.description && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {d.description}
                    </p>
                  )}
                  {d.resolution && (
                    <p className="mt-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      Resolution: {d.resolution}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {d.status === "open" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === d.id}
                      onClick={() => handleReview(d.id)}
                    >
                      Mark under review
                    </Button>
                  )}
                  {d.status === "under_review" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busy === d.id}
                        onClick={() => setResolving(d)}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === d.id}
                        onClick={() => handleClose(d.id)}
                      >
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {resolving && (
        <ResolveModal
          dispute={resolving}
          onDone={load}
          onClose={() => setResolving(null)}
        />
      )}
    </div>
  );
}
