import { create } from "zustand";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (type: ToastItem["type"], message: string, duration?: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  add: (type, message, duration) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id: crypto.randomUUID(), type, message, duration },
      ],
    })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

// Convenience helpers — import toast and call toast.success("msg")
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().add("success", message, duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().add("error", message, duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().add("info", message, duration),
};
