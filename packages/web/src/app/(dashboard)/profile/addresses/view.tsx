"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
} from "@/lib/profile.api";
import { getAllDeliveryZones } from "@/lib/delivery.api";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProfileNav } from "@/components/layout/ProfileNav";
import { AddressForm } from "@/components/profile/AddressForm";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { cardClasses } from "@/components/ui/Card";
import { apiErrorMessage, cn } from "@/lib/utils";
import type { AddressValues } from "@/lib/validations/profile";
import type { Address } from "@/lib/types";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAddresses(await getUserAddresses());
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load addresses"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getAllDeliveryZones()
      .then((zones) =>
        setCounties([...new Set(zones.map((z) => z.county))].sort()),
      )
      .catch(() => {});
  }, [load]);

  const sorted = useMemo(
    () =>
      [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    [addresses],
  );

  const toPayload = (v: AddressValues) => ({
    label: v.label,
    town: v.town,
    county: v.county,
    street: v.street || undefined,
    isDefault: v.isDefault,
  });

  // Reload after create/update: a new default unsets the old one server-side.
  const handleCreate = async (values: AddressValues) => {
    await addAddress(toPayload(values));
    await load();
    toast.success("Address added");
    setShowAdd(false);
  };

  const handleUpdate = async (values: AddressValues) => {
    if (!editing) return;
    await updateAddress(editing.id, toPayload(values));
    await load();
    toast.success("Address updated");
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await removeAddress(confirmDelete.id);
      setAddresses((prev) => prev.filter((a) => a.id !== confirmDelete.id));
      toast.info("Address deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete address"));
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await setDefaultAddress(id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id })),
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to set default"));
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Account"
        description="Your details, addresses and security."
      />

      <ProfileNav />

      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
            Delivery addresses
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your default address is selected first at checkout.
          </p>
        </div>
        {addresses.length > 0 && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={14} />
            Add address
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load your addresses"
          message={error}
          onRetry={load}
        />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon="pin"
          title="No addresses saved"
          description="Add a delivery address to check out faster."
          action={
            <Button size="sm" onClick={() => setShowAdd(true)}>
              Add your first address
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sorted.map((addr) => {
            const unsupported =
              counties.length > 0 && !counties.includes(addr.county);
            return (
              <li
                key={addr.id}
                className={cardClasses({
                  className: cn(
                    "flex flex-col",
                    addr.isDefault &&
                      "border-brand-600/60 ring-1 ring-brand-600/40 dark:border-brand-500/50",
                  ),
                })}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold capitalize text-zinc-950 dark:text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      <Icon
                        name={
                          addr.label.toLowerCase() === "work" ? "store" : "home"
                        }
                        size={14}
                      />
                    </span>
                    {addr.label}
                  </p>
                  {addr.isDefault && (
                    <Badge tone="brand" size="sm">
                      Default
                    </Badge>
                  )}
                </div>
                <address className="mt-3 flex-1 text-sm not-italic leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {addr.street && <span className="block">{addr.street}</span>}
                  <span className="block">
                    {addr.town}, {addr.county}
                  </span>
                </address>
                {unsupported && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <Icon name="alert" size={12} />
                    We don&apos;t deliver to this county yet.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {!addr.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      isLoading={settingDefaultId === addr.id}
                      onClick={() => handleSetDefault(addr.id)}
                    >
                      Set as default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(addr)}
                    aria-label={`Edit ${addr.label} address`}
                  >
                    <Icon name="edit" size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                    onClick={() => setConfirmDelete(addr)}
                    aria-label={`Delete ${addr.label} address`}
                  >
                    <Icon name="trash" size={14} />
                  </Button>
                </div>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-500 transition-colors hover:border-brand-600 hover:text-brand-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <Icon name="plus" size={20} />
              Add another address
            </button>
          </li>
        </ul>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add address"
      >
        {showAdd && (
          <AddressForm
            counties={counties}
            onSave={handleCreate}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </Modal>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit address"
      >
        {editing && (
          <AddressForm
            initial={editing}
            counties={counties}
            onSave={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete address"
        message={
          <>
            Delete the{" "}
            <span className="font-medium capitalize text-zinc-800 dark:text-zinc-200">
              {confirmDelete?.label}
            </span>{" "}
            address?
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
