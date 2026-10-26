import { create } from "zustand";

/**
 * The unread badge. The count comes from the server (notifications are
 * paged, so it can't be derived from a loaded list); `markedRead` adjusts it
 * optimistically.
 */
interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  markedRead: (n?: number) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  markedRead: (n = 1) =>
    set((s) => ({ unreadCount: Math.max(0, s.unreadCount - n) })),
  clear: () => set({ unreadCount: 0 }),
}));
