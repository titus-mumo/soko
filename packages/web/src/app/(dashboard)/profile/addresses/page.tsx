"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/profile.api";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { addressSchema, type AddressValues } from "@/lib/validations/profile";
import type { Address } from "@/lib/types";

function AddressForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Address;
  onSave: (values: AddressValues) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial
      ? {
          label: initial.label,
          town: initial.town,
          county: initial.county,
          street: initial.street ?? "",
          isDefault: initial.isDefault,
        }
      : { isDefault: false },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3" noValidate>
      <Input
        label="Label"
        placeholder="Home, Work, Other…"
        error={errors.label?.message}
        {...register("label")}
      />
      <Input
        label="Street (optional)"
        placeholder="123 Kenyatta Ave"
        error={errors.street?.message}
        {...register("street")}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Town / City"
          placeholder="Nairobi"
          error={errors.town?.message}
          {...register("town")}
        />
        <Input
          label="County"
          placeholder="Nairobi County"
          error={errors.county?.message}
          {...register("county")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          {...register("isDefault")}
          className="rounded border-zinc-300 dark:border-zinc-600"
        />
        Set as default
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initial ? "Save changes" : "Add address"}
        </Button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  useEffect(() => {
    getAddresses()
      .then(setAddresses)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (values: AddressValues) => {
    const addr = await createAddress({
      label: values.label,
      town: values.town,
      county: values.county,
      street: values.street,
      isDefault: values.isDefault,
    });
    setAddresses((prev) => [...prev, addr]);
    toast.success("Address added");
    setShowAdd(false);
  };

  const handleUpdate = async (values: AddressValues) => {
    if (!editing) return;
    const addr = await updateAddress(editing.id, {
      label: values.label,
      town: values.town,
      county: values.county,
      street: values.street,
      isDefault: values.isDefault,
    });
    setAddresses((prev) => prev.map((a) => (a.id === addr.id ? addr : a)));
    toast.success("Address updated");
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.info("Address deleted");
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await setDefaultAddress(id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id })),
      );
    } catch {
      toast.error("Failed to set default");
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Addresses
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage delivery addresses
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          Add address
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-zinc-400 dark:text-zinc-600">
            No addresses saved
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setShowAdd(true)}
          >
            Add your first address
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="rounded-md border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {addr.label}
                    </p>
                    {addr.isDefault && <Badge variant="info">Default</Badge>}
                  </div>
                  {addr.street && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {addr.street}
                    </p>
                  )}
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {addr.town}, {addr.county}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {!addr.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={settingDefaultId === addr.id}
                    onClick={() => handleSetDefault(addr.id)}
                  >
                    Set default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(addr)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={deletingId === addr.id}
                  className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  onClick={() => handleDelete(addr.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add address"
      >
        <AddressForm onSave={handleCreate} onCancel={() => setShowAdd(false)} />
      </Modal>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit address"
      >
        {editing && (
          <AddressForm
            initial={editing}
            onSave={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
