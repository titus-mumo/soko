"use client";

import { useState } from "react";
import {
  getPlatformPromotions,
  createPlatformPromotion,
  type Promotion,
} from "@/lib/admin.api";
import { toast } from "@/store/toast.store";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePagedList } from "@/hooks/usePagedList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
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

function CreatePromotionForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PromoForm>(key: K, value: PromoForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value.trim()) {
      setError("Enter a code and a discount value.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createPlatformPromotion({
        code: form.code.trim(),
        type: form.type,
        value: form.value.trim(),
        ...(form.minOrderAmount && { minOrderAmount: form.minOrderAmount }),
        ...(form.maxUses && { maxUses: Number(form.maxUses) }),
        ...(form.expiresAt && { expiresAt: form.expiresAt }),
      });
      toast.success(`Promotion ${form.code.trim()} created`);
      onCreated();
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Failed to create promotion. The code may be in use.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        New platform promotion
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Code"
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
          placeholder="SAVE20"
          className="uppercase"
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
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={saving}>
          Create promotion
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function promoStatus(p: Promotion) {
  if (p.expiresAt && new Date(p.expiresAt) < new Date())
    return { label: "Expired", variant: "zinc" as const };
  return p.isActive === false
    ? { label: "Inactive", variant: "warning" as const }
    : { label: "Active", variant: "success" as const };
}

export default function AdminPromotionsPage() {
  const list = usePagedList((page) => getPlatformPromotions(page), [], {
    errorMessage: "Couldn't load promotions",
  });
  const { items: promotions, loading, error } = list;
  const load = () => list.reload({ quiet: true });
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform promotions"
        description="Promo codes applied platform-wide"
        actions={
          !creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              New promotion
            </Button>
          )
        }
      />

      {creating && (
        <CreatePromotionForm
          onCreated={() => {
            setCreating(false);
            load();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error ? (
        <ErrorState
          title="Couldn't load promotions"
          message={error}
          onRetry={load}
        />
      ) : !loading && promotions.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No platform promotions yet"
          description="Create a code any buyer can use at checkout."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              Create a promotion
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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} aria-hidden="true">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-16 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : promotions.map((p) => {
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
    </div>
  );
}
