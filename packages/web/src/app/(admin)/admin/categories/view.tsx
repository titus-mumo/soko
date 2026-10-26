"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllCategories,
  createCategory,
  deactivateCategory,
  activateCategory,
  deleteCategory,
} from "@/lib/admin.api";
import { toast } from "@/store/toast.store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormError } from "@/components/ui/FormError";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiErrorMessage } from "@/lib/utils";
import type { Category } from "@/lib/types";

const slugify = (val: string) =>
  val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function CreateCategoryForm({
  parents,
  onCreated,
  onCancel,
}: {
  parents: Category[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || !slug) {
      setError("Enter a name (at least 2 characters) and a slug.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createCategory({
        name: name.trim(),
        slug,
        ...(parentId && { parentId }),
      });
      toast.success(`Category "${name.trim()}" created`);
      onCreated();
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Failed to create category. The slug may be taken.",
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
        New category
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
          placeholder="Phones"
        />
        <Input
          label="Slug"
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="phones"
        />
        <Select
          label="Parent (optional)"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">None — top level</option>
          {parents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={saving}>
          Create category
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCategories(await getAllCategories());
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load categories"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nameById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );
  const roots = categories.filter((c) => !c.parentId);

  const handleToggle = async (cat: Category) => {
    setBusy(cat.id);
    try {
      if (cat.isActive) await deactivateCategory(cat.id);
      else await activateCategory(cat.id);
      toast.success(
        `${cat.name} ${cat.isActive ? "deactivated" : "activated"}`,
      );
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update category"));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setBusy(target.id);
    try {
      await deleteCategory(target.id);
      setCategories((prev) => prev.filter((c) => c.id !== target.id));
      toast.success(`${target.name} deleted`);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(
        apiErrorMessage(err, "Failed to delete — it may still have products"),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description={loading ? "Loading…" : `${categories.length} total`}
        actions={
          !creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              New category
            </Button>
          )
        }
      />

      {creating && (
        <CreateCategoryForm
          parents={roots}
          onCreated={() => {
            setCreating(false);
            load();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error ? (
        <ErrorState
          title="Couldn't load categories"
          message={error}
          onRetry={load}
        />
      ) : !loading && categories.length === 0 ? (
        <EmptyState
          icon="grid"
          title="No categories yet"
          description="Sellers need categories to list products."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              Create the first category
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                {["Name", "Slug", "Parent", "Status"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
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
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-20 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : categories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {cat.slug}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {cat.parentId
                          ? (nameById[cat.parentId] ?? "Unknown")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cat.isActive ? "success" : "zinc"}>
                          {cat.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={busy === cat.id && !confirmDelete}
                            disabled={busy === cat.id}
                            onClick={() => handleToggle(cat)}
                            aria-label={`${cat.isActive ? "Deactivate" : "Activate"} ${cat.name}`}
                          >
                            {cat.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy === cat.id}
                            onClick={() => setConfirmDelete(cat)}
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                            aria-label={`Delete ${cat.name}`}
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
        title="Delete category"
        message={
          <>
            Delete{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {confirmDelete?.name}
            </span>
            ? Consider deactivating it instead if products still use it.
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
