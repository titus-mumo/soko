"use client";

import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
} from "@/lib/notifications.api";
import { useNotificationStore } from "@/store/notification.store";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const TYPE_ICONS: Record<Notification["type"], React.ReactNode> = {
  order: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" x2="21" y1="6" y2="6" />
    </svg>
  ),
  payment: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  delivery: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
      <rect width="13" height="13" x="8" y="8" rx="2" />
      <path d="M16 8V5l3 3-3 3V8z" />
    </svg>
  ),
  system: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  promotion: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
};

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    setNotifications,
    markRead,
    markAllRead,
    clear,
  } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [setNotifications]);

  const handleMarkRead = async (notif: Notification) => {
    if (notif.read) return;
    markRead(notif.id);
    try {
      await markNotificationRead(notif.id);
    } catch {
      // silent fail — local state already updated
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    markAllRead();
    try {
      await markAllNotificationsRead();
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    clear();
    try {
      await clearAllNotifications();
      toast.info("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {unreadCount} unread
            </p>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                isLoading={markingAll}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              isLoading={clearing}
              className="text-zinc-400 dark:text-zinc-600"
              onClick={handleClearAll}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-zinc-400 dark:text-zinc-600">
            No notifications
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-md border border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleMarkRead(notif)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                !notif.read
                  ? "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/10 dark:hover:bg-blue-950/20"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  !notif.read
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-zinc-400 dark:text-zinc-600",
                )}
              >
                {TYPE_ICONS[notif.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm",
                      !notif.read
                        ? "font-semibold text-zinc-900 dark:text-zinc-50"
                        : "font-medium text-zinc-700 dark:text-zinc-300",
                    )}
                  >
                    {notif.title}
                  </p>
                  {!notif.read && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {notif.body}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-600">
                  {new Date(notif.createdAt).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
