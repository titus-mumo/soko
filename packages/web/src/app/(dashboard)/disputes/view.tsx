"use client";

import { useEffect, useState } from "react";
import {
  getMyDisputes,
  raiseDispute,
  type DisputeStatus,
} from "@/lib/disputes.api";
import { getBuyerOrders } from "@/lib/orders.api";
import { toast } from "@/store/toast.store";
import { usePagedList } from "@/hooks/usePagedList";
import { LoadMore } from "@/components/ui/LoadMore";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormError } from "@/components/ui/FormError";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiErrorMessage, formatKES } from "@/lib/utils";
import type { Order } from "@/lib/types";

const STATUS_BADGE: Record<
  DisputeStatus,
  { label: string; variant: "warning" | "info" | "success" | "zinc" }
> = {
  open: { label: "Open", variant: "warning" },
  under_review: { label: "Under review", variant: "info" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "zinc" },
};

const DISPUTABLE = ["confirmed", "processing", "shipped", "delivered"];

// ─── Raise dispute modal ──────────────────────────────────────────────────────

function RaiseDisputeModal({
  orders,
  onDone,
  onClose,
}: {
  orders: Order[];
  onDone: () => void;
  onClose: () => void;
}) {
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disputableOrders = orders.filter((o) => DISPUTABLE.includes(o.status));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      setError("Select an order.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Describe the problem in at least 5 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await raiseDispute({
        orderId,
        reason: reason.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Dispute raised — we'll be in touch");
      onDone();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to raise dispute."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Raise a dispute">
      {disputableOrders.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You can raise a dispute on orders that are confirmed, processing,
            shipped or delivered. You don&apos;t have any yet.
          </p>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Select
            label="Order"
            placeholder="Select an order…"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          >
            {disputableOrders.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.id.slice(-8).toUpperCase()} — {formatKES(o.totalAmount)} (
                {o.status})
              </option>
            ))}
          </Select>
          <Input
            label="What went wrong?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Item not as described"
          />
          <Textarea
            label="Details (optional)"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Anything that helps us resolve it…"
          />
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Raise dispute
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DisputesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [showModal, setShowModal] = useState(false);

  const list = usePagedList((page) => getMyDisputes(page), [], {
    errorMessage: "Couldn't load your disputes",
  });
  const { items: disputes, loading, error } = list;
  const load = () => list.reload();

  // Disputes are about recent orders: the latest 100 are plenty to pick from.
  useEffect(() => {
    getBuyerOrders({ limit: 100 })
      .then((page) => setOrders(page.items))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes"
        description="Raise and track disputes on your orders"
        actions={
          <Button size="sm" onClick={() => setShowModal(true)}>
            Raise dispute
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
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
          title="No disputes"
          description="If something goes wrong with an order, raise a dispute and our team will step in."
          action={
            <ButtonLink href="/orders" variant="secondary" size="sm">
              View your orders
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {disputes.map((d) => {
            const badge = STATUS_BADGE[d.status];
            return (
              <li
                key={d.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono">
                        #{d.id.slice(-8).toUpperCase()}
                      </span>
                      <span>Order #{d.orderId.slice(-8).toUpperCase()}</span>
                      <time dateTime={d.createdAt}>
                        {new Date(d.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <h2 className="mt-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {d.reason}
                    </h2>
                    {d.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {d.description}
                      </p>
                    )}
                    {d.resolution && (
                      <div className="mt-2 rounded border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950/20">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">
                          Resolution
                        </p>
                        <p className="mt-0.5 text-xs text-green-700 dark:text-green-400">
                          {d.resolution}
                        </p>
                      </div>
                    )}
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <LoadMore
        hasMore={list.hasMore}
        loading={list.loadingMore}
        onLoadMore={list.loadMore}
      />

      {showModal && (
        <RaiseDisputeModal
          orders={orders}
          onDone={load}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
