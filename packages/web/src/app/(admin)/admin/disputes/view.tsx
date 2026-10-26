"use client";

import { useState } from "react";
import {
  getDisputesByStatus,
  reviewDispute,
  resolveDispute,
  closeDispute,
  type Dispute,
  type DisputeStatus,
} from "@/lib/admin.api";
import { toast } from "@/store/toast.store";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePagedList } from "@/hooks/usePagedList";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { FormError } from "@/components/ui/FormError";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiErrorMessage } from "@/lib/utils";

const TABS: DisputeStatus[] = ["open", "under_review", "resolved", "closed"];

const TAB_LABEL: Record<DisputeStatus, string> = {
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
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolution.trim().length < 10) {
      setError("Describe the resolution in at least 10 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await resolveDispute(dispute.id, resolution.trim());
      toast.success("Dispute resolved — the buyer has been notified");
      onDone();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to resolve dispute."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Resolve dispute">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          {dispute.reason}
        </div>
        <Textarea
          label="Resolution"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={4}
          placeholder="What was decided, e.g. full refund issued to M-Pesa…"
        />
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Resolve
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminDisputesPage() {
  const [tab, setTab] = useState<DisputeStatus>("open");
  const list = usePagedList((page) => getDisputesByStatus(tab, page), [tab], {
    errorMessage: "Couldn't load disputes",
  });
  const { items: disputes, loading, error } = list;
  const load = () => list.reload({ quiet: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Dispute | null>(null);
  const [confirmClose, setConfirmClose] = useState<Dispute | null>(null);

  const handleReview = async (d: Dispute) => {
    setBusy(d.id);
    try {
      await reviewDispute(d.id);
      toast.success("Marked under review");
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update dispute"));
    } finally {
      setBusy(null);
    }
  };

  const handleClose = async () => {
    if (!confirmClose) return;
    setBusy(confirmClose.id);
    try {
      await closeDispute(confirmClose.id);
      toast.success("Dispute closed");
      setConfirmClose(null);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to close dispute"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes"
        description="Manage buyer disputes by status"
      />

      <FilterChips
        label="Filter disputes by status"
        value={tab}
        onChange={setTab}
        options={TABS.map((s) => ({ value: s, label: TAB_LABEL[s] }))}
      />

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load disputes"
          message={error}
          onRetry={load}
        />
      ) : disputes.length === 0 ? (
        <EmptyState
          icon="shield"
          title={`No ${TAB_LABEL[tab].toLowerCase()} disputes`}
          description={
            tab === "open" ? "Nothing needs attention right now." : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {disputes.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono">
                      #{d.id.slice(-8).toUpperCase()}
                    </span>
                    <span>Order #{d.orderId.slice(-8).toUpperCase()}</span>
                    <time dateTime={d.createdAt}>
                      {new Date(d.createdAt).toLocaleDateString("en-KE")}
                    </time>
                  </div>
                  <h2 className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {d.reason}
                  </h2>
                  {d.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {d.description}
                    </p>
                  )}
                  {d.resolution && (
                    <p className="mt-2 rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-400">
                      Resolution: {d.resolution}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {d.status === "open" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={busy === d.id}
                      onClick={() => handleReview(d)}
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
                        onClick={() => setConfirmClose(d)}
                      >
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <LoadMore
        hasMore={list.hasMore}
        loading={list.loadingMore}
        onLoadMore={list.loadMore}
      />

      {resolving && (
        <ResolveModal
          dispute={resolving}
          onDone={load}
          onClose={() => setResolving(null)}
        />
      )}
      <ConfirmDialog
        open={confirmClose !== null}
        title="Close dispute"
        message="Close this dispute without a resolution? The buyer will see it as closed."
        confirmLabel="Close dispute"
        loading={busy === confirmClose?.id}
        onConfirm={handleClose}
        onClose={() => setConfirmClose(null)}
      />
    </div>
  );
}
