"use client";

import { useEffect, useState } from "react";
import {
  getAllUsers,
  updateUserRole,
  verifyUser,
  deleteUser,
} from "@/lib/admin.api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { UserProfile } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    getAllUsers()
      .then(setUsers)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleRole = async (
    userId: string,
    role: "buyer" | "seller" | "admin",
  ) => {
    setBusy(userId);
    await updateUserRole(userId, role).catch(() => {});
    await load();
    setBusy(null);
  };

  const handleVerify = async (userId: string) => {
    setBusy(userId);
    await verifyUser(userId).catch(() => {});
    await load();
    setBusy(null);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setBusy(userId);
    await deleteUser(userId).catch(() => {});
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setBusy(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Users
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage user roles and verification
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-100 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {["Name", "Email / Phone", "Role", "Actions"].map((h) => (
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
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-24 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {u.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {u.email ?? u.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : u.role === "seller"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {u.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy === u.id}
                            onClick={() =>
                              handleRole(
                                u.id,
                                u.role === "seller" ? "buyer" : "seller",
                              )
                            }
                          >
                            {u.role === "seller" ? "Make buyer" : "Make seller"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy === u.id}
                          onClick={() => handleVerify(u.id)}
                        >
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy === u.id}
                          onClick={() => handleDelete(u.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && users.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
            No users found
          </p>
        )}
      </div>
    </div>
  );
}
