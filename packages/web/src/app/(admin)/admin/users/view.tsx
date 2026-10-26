"use client";

import { useState } from "react";
import {
  getAllUsers,
  updateUserRole,
  verifyUser,
  deleteUser,
} from "@/lib/admin.api";
import { toast } from "@/store/toast.store";
import { LoadMore } from "@/components/ui/LoadMore";
import { usePagedList } from "@/hooks/usePagedList";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiErrorMessage } from "@/lib/utils";
import type { User, UserRole } from "@/lib/types";

const ROLE_BADGE: Record<UserRole, "error" | "info" | "default"> = {
  admin: "error",
  seller: "info",
  buyer: "default",
};

export default function AdminUsersPage() {
  const list = usePagedList((page) => getAllUsers(page), [], {
    errorMessage: "Couldn't load users",
  });
  const { items: users, setItems: setUsers, loading, error } = list;
  const load = () => list.reload({ quiet: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const run = async (
    userId: string,
    action: () => Promise<void>,
    success: string,
    failure: string,
  ) => {
    setBusy(userId);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, failure));
    } finally {
      setBusy(null);
    }
  };

  const handleRole = (u: User) => {
    const role: UserRole = u.role === "seller" ? "buyer" : "seller";
    return run(
      u.id,
      () => updateUserRole(u.id, role),
      `${u.name} is now a ${role}`,
      "Failed to change role",
    );
  };

  const handleVerify = (u: User) =>
    run(
      u.id,
      () => verifyUser(u.id),
      `${u.name} verified`,
      "Failed to verify user",
    );

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setBusy(target.id);
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      toast.success(`${target.name} deleted`);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete user"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={
          loading
            ? "Loading…"
            : `${users.length}${list.hasMore ? "+" : ""} user${users.length !== 1 || list.hasMore ? "s" : ""}`
        }
      />

      {error ? (
        <ErrorState
          title="Couldn't load users"
          message={error}
          onRetry={load}
        />
      ) : !loading && users.length === 0 ? (
        <EmptyState
          icon="users"
          title="No users yet"
          description="People who sign up will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
              <tr>
                {["Name", "Contact", "Role", "Verified"].map((h) => (
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
                          <Skeleton className="h-4 w-24 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : users.map((u) => (
                    <tr key={u.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {u.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        <div>{u.email}</div>
                        <div className="text-xs">{u.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ROLE_BADGE[u.role] ?? "default"}>
                          <span className="capitalize">{u.role}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {u.isVerified ? (
                          <Badge tone="success">
                            <Icon name="shield" size={12} />
                            Verified
                          </Badge>
                        ) : (
                          "No"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {u.role !== "admin" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              isLoading={busy === u.id && !confirmDelete}
                              disabled={busy === u.id}
                              onClick={() => handleRole(u)}
                              aria-label={`Make ${u.name} a ${u.role === "seller" ? "buyer" : "seller"}`}
                            >
                              {u.role === "seller"
                                ? "Make buyer"
                                : "Make seller"}
                            </Button>
                          )}
                          {!u.isVerified && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy === u.id}
                              onClick={() => handleVerify(u)}
                              aria-label={`Verify ${u.name}`}
                            >
                              Verify
                            </Button>
                          )}
                          {u.role !== "admin" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy === u.id}
                              onClick={() => setConfirmDelete(u)}
                              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                              aria-label={`Delete ${u.name}`}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      <LoadMore
        hasMore={list.hasMore}
        loading={list.loadingMore}
        onLoadMore={list.loadMore}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete user"
        message={
          <>
            Delete{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {confirmDelete?.name}
            </span>
            ? This cannot be undone.
          </>
        }
        confirmLabel="Delete user"
        destructive
        loading={busy === confirmDelete?.id}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
