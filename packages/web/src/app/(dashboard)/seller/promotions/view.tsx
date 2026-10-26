"use client";

import { useState } from "react";
import {
  getSellerPromotions,
  createSellerPromotion,
  activateSellerPromotion,
  deactivateSellerPromotion,
  deleteSellerPromotion,
  type SellerPromotion,
} from "@/lib/seller-promotions.api";
import { toast } from "@/store/toast.store";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePagedList } from "@/hooks/usePagedList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormError } from "@/components/ui/FormError";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiErrorMessage, formatKES } from "@/lib/utils";

type PromoForm = {
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrderAmount: string;
  maxUses: string;
  expiresAt: string;
};

const EMPTY_FORM: PromoForm = {
  code: "",
  type: "percent",
  value: "",
  minOrderAmount: "",
  maxUses: "",
  expiresAt: "",
};

function CreatePromotionModal({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PromoForm>(k: K, v: PromoForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value.trim()) {
      setError("Enter a code and a discount value.");
      return;
    }
    if (
      form.type === "percent" &&
      (Number(form.value) <= 0 || Number(form.value) > 100)
    ) {
      setError("A percentage discount must be between 1 and 100.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createSellerPromotion({
        code: form.code.trim(),
        type: form.type,
        value: form.value.trim(),
        ...(form.minOrderAmount && { minOrderAmount: form.minOrderAmount }),
        ...(form.maxUses && { maxUses: Number(form.maxUses) }),
        ...(form.expiresAt && { expiresAt: form.expiresAt }),
      });
      toast.success(`Promotion ${form.code.trim()} created`);
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to create promotion."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New promotion">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="SAVE20"
            className="uppercase"
            autoCapitalize="characters"
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => set("type", e.target.value as PromoForm["type"])}
          >
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed (KES)</option>
          </Select>
          <Input
            label={form.type === "percent" ? "Discount (%)" : "Discount (KES)"}
            value={form.value}
            onChange={(e) => set("value", e.target.value)}
            placeholder={form.type === "percent" ? "20" : "500"}
            inputMode="decimal"
          />
          <Input
            label="Minimum order (KES, optional)"
            value={form.minOrderAmount}
            onChange={(e) => set("minOrderAmount", e.target.value)}
            placeholder="1000"
            inputMode="decimal"
          />
          <Input
            label="Max uses (optional)"
            type="number"
            min={1}
            value={form.maxUses}
            onChange={(e) => set("maxUses", e.target.value)}
          />
          <Input
            label="Expires (optional)"
            type="date"
            value={form.expiresAt}
            onChange={(e) => set("expiresAt", e.target.value)}
          />
        </div>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Create promotion
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function promoStatus(p: SellerPromotion) {
  const expired = !!p.expiresAt && new Date(p.expiresAt) < new Date();
  if (expired) return { label: "Expired", variant: "zinc" as const, expired };
  return p.isActive
    ? { label: "Active", variant: "success" as const, expired }
    : { label: "Paused", variant: "warning" as const, expired };
}

export default function SellerPromotionsPage() {
  const list = usePagedList((page) => getSellerPromotions(page), [], {
    errorMessage: "Couldn't load your promotions",
  });
  const { items: promotions, setItems: setPromotions, loading, error } = list;
  const load = () => list.reload({ quiet: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SellerPromotion | null>(
    null,
  );

  const handleToggle = async (p: SellerPromotion) => {
    setBusy(p.id);
    try {
      if (p.isActive) await deactivateSellerPromotion(p.id);
      else await activateSellerPromotion(p.id);
      setPromotions((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, isActive: !p.isActive } : x)),
      );
      toast.success(p.isActive ? `${p.code} paused` : `${p.code} activated`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update promotion"));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusy(confirmDelete.id);
    try {
      await deleteSellerPromotion(confirmDelete.id);
      setPromotions((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      toast.success("Promotion deleted");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete promotion"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions"
        description="Discount codes for your store"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            New promotion
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load promotions"
          message={error}
          onRetry={load}
        />
      ) : promotions.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No promotions yet"
          description="Create a discount code to share with your customers."
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              Create your first promotion
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                {[
                  "Code",
                  "Discount",
                  "Min order",
                  "Uses",
                  "Expires",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {promotions.map((p) => {
                const status = promoStatus(p);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {p.code}
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3 font-mono text-zinc-800 dark:text-zinc-200">
                      {p.type === "percent"
                        ? `${p.value}%`
                        : formatKES(p.value)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {p.minOrderAmount ? formatKES(p.minOrderAmount) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {p.usedCount ?? 0}
                      {p.maxUses ? ` / ${p.maxUses}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {p.expiresAt
                        ? new Date(p.expiresAt).toLocaleDateString("en-KE")
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {!status.expired && (
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={busy === p.id && !confirmDelete}
                            disabled={busy === p.id}
                            onClick={() => handleToggle(p)}
                            aria-label={`${p.isActive ? "Pause" : "Activate"} ${p.code}`}
                          >
                            {p.isActive ? "Pause" : "Activate"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === p.id}
                          onClick={() => setConfirmDelete(p)}
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                          aria-label={`Delete ${p.code}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <LoadMore
        hasMore={list.hasMore}
        loading={list.loadingMore}
        onLoadMore={list.loadMore}
      />

      {showCreate && (
        <CreatePromotionModal
          onCreated={load}
          onClose={() => setShowCreate(false)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete promotion"
        message={
          <>
            Delete{" "}
            <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
              {confirmDelete?.code}
            </span>
            ? Customers won&apos;t be able to use it any more.
          </>
        }
        confirmLabel="Delete"
        destructive
        loading={busy === confirmDelete?.id}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
