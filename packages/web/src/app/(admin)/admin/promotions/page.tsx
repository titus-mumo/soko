"use client";

import { useEffect, useState } from "react";
import {
  getPlatformPromotions,
  createPlatformPromotion,
  type Promotion,
} from "@/lib/admin.api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const INIT = {
  code: "",
  type: "percent" as "percent" | "fixed",
  value: "",
  minOrderAmount: "",
  maxUses: "",
  expiresAt: "",
};

function CreatePromotionForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createPlatformPromotion({
        code: form.code,
        type: form.type,
        value: form.value,
        ...(form.minOrderAmount ? { minOrderAmount: form.minOrderAmount } : {}),
        ...(form.maxUses ? { maxUses: Number(form.maxUses) } : {}),
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
      });
      setForm(INIT);
      setOpen(false);
      onCreated();
    } catch {
      setError("Failed to create promotion. Code may already be in use.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        New promotion
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            Code
          </label>
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            required
            placeholder="SAVE20"
            className="h-8 rounded border border-zinc-200 bg-white px-3 text-sm uppercase text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            Type
          </label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="h-8 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed (KES)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            Value
          </label>
          <input
            value={form.value}
            onChange={(e) => set("value", e.target.value)}
            required
            placeholder={form.type === "percent" ? "20" : "500"}
            className="h-8 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            Min order (KES, optional)
          </label>
          <input
            value={form.minOrderAmount}
            onChange={(e) => set("minOrderAmount", e.target.value)}
            placeholder="1000"
            className="h-8 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            Max uses (optional)
          </label>
          <input
            type="number"
            min={1}
            value={form.maxUses}
            onChange={(e) => set("maxUses", e.target.value)}
            className="h-8 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            Expires at (optional)
          </label>
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => set("expiresAt", e.target.value)}
            className="h-8 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    getPlatformPromotions()
      .then(setPromotions)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Platform promotions
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Promo codes applied platform-wide
          </p>
        </div>
        <CreatePromotionForm onCreated={load} />
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-100 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {[
                "Code",
                "Type",
                "Value",
                "Min order",
                "Uses",
                "Expires",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-16 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : promotions.map((p) => {
                  const expired =
                    p.expiresAt && new Date(p.expiresAt) < new Date();
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3 font-mono text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {p.code}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-zinc-600 dark:text-zinc-400">
                        {p.type}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200">
                        {p.type === "percent"
                          ? `${p.value}%`
                          : `KES ${Number(p.value).toLocaleString()}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {p.minOrderAmount
                          ? `KES ${Number(p.minOrderAmount).toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {p.usedCount ?? 0}
                        {p.maxUses ? ` / ${p.maxUses}` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {p.expiresAt
                          ? new Date(p.expiresAt).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            expired || p.isActive === false
                              ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {expired
                            ? "Expired"
                            : p.isActive === false
                              ? "Inactive"
                              : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && promotions.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
            No platform promotions yet
          </p>
        )}
      </div>
    </div>
  );
}
