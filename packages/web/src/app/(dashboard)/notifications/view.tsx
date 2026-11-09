"use client";

import { useState } from "react";
import { NotificationSkeleton } from "@/components/skeletons";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
} from "@/lib/notifications.api";
import { useNotificationStore } from "@/store/notification.store";
import { toast } from "@/store/toast.store";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cardClasses } from "@/components/ui/Card";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { usePagedList } from "@/hooks/usePagedList";
import { LoadMore } from "@/components/ui/LoadMore";
import { syncUnreadCount } from "@/lib/sync";
import { apiErrorMessage, cn, relativeTime } from "@/lib/utils";
import type { Notification } from "@/lib/types";

// Server types are free-form (order_update, promo_applied, …) — match by keyword.
function iconFor(type: string): IconName {
  if (/order/.test(type)) return "bag";
  if (/pay/.test(type)) return "wallet";
  if (/ship|deliver/.test(type)) return "truck";
  if (/promo/.test(type)) return "tag";
  if (/review/.test(type)) return "star";
  if (/alert|security/.test(type)) return "triangle-alert";
  return "info";
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** Buckets newest-first notifications into Today / Yesterday / This week / Earlier. */
function groupByDate(
  list: Notification[],
): { label: string; items: Notification[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t = startOfToday.getTime();
  const day = 86_400_000;
  const bucket = (iso: string) => {
    const ts = new Date(iso).getTime();
    if (ts >= t) return "Today";
    if (ts >= t - day) return "Yesterday";
    if (ts >= t - 6 * day) return "This week";
    return "Earlier";
  };
  const groups: { label: string; items: Notification[] }[] = [];
  for (const n of list) {
    const label = bucket(n.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}

export default function NotificationsPage({
  admin = false,
}: {
  /** The admin's inbox: no shopper links (there are no orders to view). */
  admin?: boolean;
}) {
  const { unreadCount, markedRead } = useNotificationStore();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Unread is filtered on the server, so the tab isn't limited to loaded pages.
  const list = usePagedList(
    (page) => getUserNotifications(page, filter === "unread"),
    [filter],
    { errorMessage: "Failed to load notifications" },
  );
  const { items: visible, setItems, loading, error } = list;
  const load = () => {
    list.reload({ quiet: true });
    syncUnreadCount();
  };
  useRefetchOnFocus(load);

  const handleMarkRead = async (notif: Notification) => {
    if (notif.isRead) return;
    // Optimistic; on the Unread tab it stays until the next reload.
    setItems((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
    );
    markedRead();
    try {
      await markAsRead(notif.id);
    } catch {
      load(); // resync on failure
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      useNotificationStore.getState().setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to mark all as read"));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (notif: Notification) => {
    setDeletingId(notif.id);
    try {
      await deleteNotification(notif.id);
      setItems((prev) => prev.filter((n) => n.id !== notif.id));
      if (!notif.isRead) markedRead();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete notification"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAll();
      setItems([]);
      useNotificationStore.getState().clear();
      toast.info("All notifications cleared");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to clear notifications"));
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"
        }
        actions={
          (visible.length > 0 || filter === "unread") && (
            <>
              <Button
                variant="secondary"
                size="sm"
                isLoading={markingAll}
                disabled={unreadCount === 0}
                onClick={handleMarkAllRead}
              >
                <Icon name="check" size={14} />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-500 dark:text-zinc-400"
                onClick={() => setConfirmClear(true)}
              >
                Clear all
              </Button>
            </>
          )
        }
      />

      {(visible.length > 0 || filter === "unread") && (
        <FilterChips
          label="Filter notifications"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: "Unread", count: unreadCount },
          ]}
        />
      )}

      {loading ? (
        <NotificationSkeleton />
      ) : error ? (
        <ErrorState
          title="Couldn't load notifications"
          message={error}
          onRetry={() => list.reload()}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="bell"
          title={
            filter === "unread"
              ? "No unread notifications"
              : "You're all caught up"
          }
          description={
            filter === "unread"
              ? "You've read everything."
              : "Notifications will appear here"
          }
          action={
            filter === "unread" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFilter("all")}
              >
                Show all
              </Button>
            ) : (
              <ButtonLink
                href={admin ? "/admin/monitoring" : "/orders"}
                variant="secondary"
                size="sm"
              >
                {admin ? "Open monitoring" : "View your orders"}
              </ButtonLink>
            )
          }
        />
      ) : (
        <div className="space-y-8">
          {groupByDate(visible).map((group) => (
            <section key={group.label} aria-labelledby={`group-${group.label}`}>
              <h2
                id={`group-${group.label}`}
                className="mb-3 font-sans text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                {group.label}
              </h2>
              <ul
                className={cardClasses({
                  padded: false,
                  className:
                    "divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800",
                })}
              >
                {group.items.map((notif) => (
                  <li
                    key={notif.id}
                    className={cn(
                      "group relative flex items-start gap-3 border-l-2 py-4 pl-4 pr-3 transition-colors sm:pl-5",
                      notif.isRead
                        ? "border-transparent"
                        : "border-brand-600 bg-brand-600/[0.04] dark:bg-brand-500/[0.06]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notif)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded text-left"
                      aria-label={
                        notif.isRead
                          ? notif.title
                          : `Mark "${notif.title}" as read`
                      }
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          notif.isRead
                            ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-brand-600/10 text-brand-700 dark:text-brand-400",
                        )}
                      >
                        <Icon name={iconFor(notif.type)} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span
                            className={cn(
                              "text-sm",
                              notif.isRead
                                ? "font-medium text-zinc-700 dark:text-zinc-300"
                                : "font-semibold text-zinc-950 dark:text-white",
                            )}
                          >
                            {notif.title}
                            {!notif.isRead && (
                              <span className="sr-only"> (unread)</span>
                            )}
                          </span>
                          <time
                            dateTime={notif.createdAt}
                            title={new Date(notif.createdAt).toLocaleString(
                              "en-KE",
                            )}
                            className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            {group.label === "Today"
                              ? relativeTime(notif.createdAt)
                              : timeOf(notif.createdAt)}
                          </time>
                        </span>
                        <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">
                          {notif.body}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(notif)}
                      disabled={deletingId === notif.id}
                      aria-label={`Delete "${notif.title}"`}
                      className="tap-target flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-[opacity,background-color,color] hover:bg-zinc-100 hover:text-zinc-700 focus-visible:opacity-100 disabled:opacity-40 group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 [@media(hover:hover)]:opacity-0"
                    >
                      {deletingId === notif.id ? (
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                        />
                      ) : (
                        <Icon name="x" size={14} />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <LoadMore
            hasMore={list.hasMore}
            loading={list.loadingMore}
            onLoadMore={list.loadMore}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear all notifications"
        message="This permanently deletes all your notifications."
        confirmLabel="Clear all"
        destructive
        loading={clearing}
        onConfirm={handleClearAll}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
