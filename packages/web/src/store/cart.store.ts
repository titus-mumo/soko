import { create } from "zustand";
import type { CartItem } from "@/lib/types";

interface CartStore {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  setCart: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clear: () => void;
}

function computeSubtotal(items: CartItem[]) {
  return items.reduce(
    (sum, i) => sum + (i.price ?? Number(i.variant?.price ?? 0)) * i.quantity,
    0,
  );
}

function computeCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,

  setCart: (items) =>
    set({
      items,
      itemCount: computeCount(items),
      subtotal: computeSubtotal(items),
    }),

  addItem: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.id === item.id);
      const updated = existing
        ? s.items.map((i) =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          )
        : [...s.items, item];
      return {
        items: updated,
        itemCount: computeCount(updated),
        subtotal: computeSubtotal(updated),
      };
    }),

  removeItem: (itemId) =>
    set((s) => {
      const updated = s.items.filter((i) => i.id !== itemId);
      return {
        items: updated,
        itemCount: computeCount(updated),
        subtotal: computeSubtotal(updated),
      };
    }),

  updateQuantity: (itemId, quantity) =>
    set((s) => {
      const updated =
        quantity <= 0
          ? s.items.filter((i) => i.id !== itemId)
          : s.items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
      return {
        items: updated,
        itemCount: computeCount(updated),
        subtotal: computeSubtotal(updated),
      };
    }),

  clear: () => set({ items: [], itemCount: 0, subtotal: 0 }),
}));
