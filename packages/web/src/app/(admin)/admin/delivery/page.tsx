"use client";

import { useEffect, useState } from "react";
import {
  getDeliveryZones,
  createDeliveryZone,
  updateDeliveryZoneFee,
  deleteDeliveryZone,
  type DeliveryZone,
} from "@/lib/admin.api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

function CreateZoneForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    county: "",
    baseFee: "",
    estimatedDays: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createDeliveryZone({
        name: form.name,
        county: form.county,
        baseFee: form.baseFee,
        estimatedDays: Number(form.estimatedDays),
      });
      setForm({ name: "", county: "", baseFee: "", estimatedDays: "" });
      setOpen(false);
      onCreated();
    } catch {
      setError("Failed to create zone.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        New zone
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {[
        { key: "name", label: "Name" },
        { key: "county", label: "County" },
        { key: "baseFee", label: "Base fee (KES)" },
        { key: "estimatedDays", label: "Est. days", type: "number" },
      ].map(({ key, label, type }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">
            {label}
          </label>
          <input
            type={type ?? "text"}
            value={form[key as keyof typeof form]}
            onChange={(e) => set(key, e.target.value)}
            required
            min={type === "number" ? 1 : undefined}
            className="h-8 w-36 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
      ))}
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
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

function EditFeeCell({
  zone,
  onSaved,
}: {
  zone: DeliveryZone;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState(zone.baseFee);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateDeliveryZoneFee(zone.id, fee).catch(() => {});
    setSaving(false);
    setEditing(false);
    onSaved();
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
      >
        KES {Number(zone.baseFee).toLocaleString()}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        className="h-7 w-24 rounded border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      />
      <Button size="sm" disabled={saving} onClick={save}>
        {saving ? "…" : "Save"}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </div>
  );
}

export default function AdminDeliveryPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    getDeliveryZones()
      .then(setZones)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (zoneId: string) => {
    if (!confirm("Delete this delivery zone?")) return;
    setBusy(zoneId);
    await deleteDeliveryZone(zoneId).catch(() => {});
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    setBusy(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Delivery zones
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {zones.length} zone{zones.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <CreateZoneForm onCreated={load} />
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-100 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {["Name", "County", "Base fee", "Est. days", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-20 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : zones.map((zone) => (
                  <tr
                    key={zone.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {zone.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {zone.county}
                    </td>
                    <td className="px-4 py-3">
                      <EditFeeCell zone={zone} onSaved={load} />
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {zone.estimatedDays} day
                      {zone.estimatedDays !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === zone.id}
                        onClick={() => handleDelete(zone.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && zones.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
            No delivery zones configured
          </p>
        )}
      </div>
    </div>
  );
}
