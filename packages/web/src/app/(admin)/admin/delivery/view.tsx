"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDeliveryZones,
  createDeliveryZone,
  updateDeliveryZoneFee,
  deleteDeliveryZone,
} from "@/lib/admin.api";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormError } from "@/components/ui/FormError";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiErrorMessage, formatKES } from "@/lib/utils";
import type { DeliveryZone } from "@/lib/types";

type ZoneForm = {
  name: string;
  county: string;
  baseFee: string;
  estimatedDays: string;
};
const EMPTY_ZONE: ZoneForm = {
  name: "",
  county: "",
  baseFee: "",
  estimatedDays: "",
};

function CreateZoneForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ZoneForm>(EMPTY_ZONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof ZoneForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.county.trim()) {
      setError("Enter a zone name and county.");
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(form.baseFee)) {
      setError("Enter the base fee as a number, e.g. 250.");
      return;
    }
    if (!(Number(form.estimatedDays) >= 1)) {
      setError("Estimated days must be at least 1.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createDeliveryZone({
        name: form.name.trim(),
        county: form.county.trim(),
        baseFee: form.baseFee,
        estimatedDays: Number(form.estimatedDays),
      });
      toast.success(`Zone "${form.name.trim()}" created`);
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to create zone."));
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
        New delivery zone
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Zone name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Nairobi CBD"
        />
        <Input
          label="County"
          value={form.county}
          onChange={(e) => set("county", e.target.value)}
          placeholder="Nairobi"
        />
        <Input
          label="Base fee (KES)"
          value={form.baseFee}
          onChange={(e) => set("baseFee", e.target.value)}
          placeholder="250"
          inputMode="decimal"
        />
        <Input
          label="Estimated days"
          type="number"
          min={1}
          value={form.estimatedDays}
          onChange={(e) => set("estimatedDays", e.target.value)}
          placeholder="2"
        />
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={saving}>
          Create zone
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+(\.\d{1,2})?$/.test(fee)) {
      toast.error("Enter the fee as a number, e.g. 250");
      return;
    }
    setSaving(true);
    try {
      await updateDeliveryZoneFee(zone.id, fee);
      toast.success(`${zone.name} fee updated`);
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update fee"));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        aria-label={`Edit fee for ${zone.name}, currently ${formatKES(zone.baseFee)}`}
      >
        <span className="tabular font-mono">{formatKES(zone.baseFee)}</span>
      </button>
    );
  }

  return (
    <form onSubmit={save} className="flex items-center gap-1.5">
      <label htmlFor={`fee-${zone.id}`} className="sr-only">
        Base fee for {zone.name} (KES)
      </label>
      <input
        id={`fee-${zone.id}`}
        type="text"
        inputMode="decimal"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        autoFocus
        className="h-7 w-24 rounded border border-zinc-300 bg-white px-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      />
      <Button type="submit" size="sm" isLoading={saving}>
        Save
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          setFee(zone.baseFee);
          setEditing(false);
        }}
      >
        Cancel
      </Button>
    </form>
  );
}

export default function AdminDeliveryPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DeliveryZone | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setZones(await getDeliveryZones());
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load delivery zones"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setDeleting(true);
    try {
      await deleteDeliveryZone(target.id);
      setZones((prev) => prev.filter((z) => z.id !== target.id));
      toast.success(`${target.name} deleted`);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete zone"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery zones"
        description={
          loading
            ? "Loading…"
            : `${zones.length} zone${zones.length !== 1 ? "s" : ""} configured`
        }
        actions={
          !creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              New zone
            </Button>
          )
        }
      />

      {creating && (
        <CreateZoneForm
          onCreated={() => {
            setCreating(false);
            load();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error ? (
        <ErrorState
          title="Couldn't load delivery zones"
          message={error}
          onRetry={load}
        />
      ) : !loading && zones.length === 0 ? (
        <EmptyState
          icon="truck"
          title="No delivery zones"
          description="Buyers can't check out until their county has a delivery zone."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              Add the first zone
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                {["Name", "County", "Base fee", "Est. days"].map((h) => (
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
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-20 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : zones.map((zone) => (
                    <tr key={zone.id}>
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {zone.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {zone.county}
                      </td>
                      <td className="px-4 py-3">
                        <EditFeeCell zone={zone} onSaved={load} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {zone.estimatedDays} day
                        {zone.estimatedDays !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDelete(zone)}
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                            aria-label={`Delete ${zone.name}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete delivery zone"
        message={
          <>
            Delete{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {confirmDelete?.name}
            </span>
            ? Buyers in {confirmDelete?.county} won&apos;t be able to check out
            unless another zone covers it.
          </>
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
