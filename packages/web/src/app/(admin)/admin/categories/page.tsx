"use client";

import { useEffect, useState } from "react";
import {
  getAllCategories,
  createCategory,
  deactivateCategory,
  activateCategory,
  deleteCategory,
} from "@/lib/admin.api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Category } from "@/lib/types";

function CreateCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const autoSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(autoSlug(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createCategory({ name, slug });
      setName("");
      setSlug("");
      setOpen(false);
      onCreated();
    } catch {
      setError("Failed to create category. Slug may already be taken.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        New category
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">Name</label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          className="h-8 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">Slug</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          className="h-8 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    getAllCategories()
      .then(setCategories)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (cat: Category) => {
    setBusy(cat.id);
    const isActive = (cat as any).isActive !== false;
    if (isActive) {
      await deactivateCategory(cat.id).catch(() => {});
    } else {
      await activateCategory(cat.id).catch(() => {});
    }
    await load();
    setBusy(null);
  };

  const handleDelete = async (catId: string) => {
    if (!confirm("Delete this category?")) return;
    setBusy(catId);
    await deleteCategory(catId).catch(() => {});
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    setBusy(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Categories
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {categories.length} total
          </p>
        </div>
        <CreateCategoryForm onCreated={load} />
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-100 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {["Name", "Slug", "Parent", "Products", "Status", "Actions"].map(
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
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-20 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : categories.map((cat) => {
                  const isActive = (cat as any).isActive !== false;
                  return (
                    <tr
                      key={cat.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {cat.slug}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {cat.parentId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {cat.productCount ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy === cat.id}
                            onClick={() => handleToggle(cat)}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy === cat.id}
                            onClick={() => handleDelete(cat.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
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
        {!loading && categories.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
            No categories yet
          </p>
        )}
      </div>
    </div>
  );
}
