import { create } from "zustand";
import type { CartLine } from "@/lib/types";

interface CartStore {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  /**
   * Variants in the cart, known on every page (not just the cart page), so
   * product cards and pages can show "In cart" instead of offering it again.
   */
  variantIds: string[];
  /** Replace the cart. Pass the server subtotal when known (e.g. /cart/summary). */
  setCart: (items: CartLine[], subtotal?: number) => void;
  /** Set counts without item details — used for the nav badge on load. */
  setTotals: (
    itemCount: number,
    subtotal: number,
    variantIds?: string[],
  ) => void;
  addItem: (item: CartLine) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

function computeSubtotal(items: CartLine[]) {
  return items.reduce(
    (sum, i) => sum + Number(i.details?.variant.price ?? 0) * i.quantity,
    0,
  );
}

function computeCount(items: CartLine[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

function totals(items: CartLine[]) {
  return {
    items,
    itemCount: computeCount(items),
    subtotal: computeSubtotal(items),
    variantIds: items.map((i) => i.productVariantId),
  };
}

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  variantIds: [],

  setCart: (items, subtotal) =>
    set({
      ...totals(items),
      ...(subtotal !== undefined && { subtotal }),
    }),

  setTotals: (itemCount, subtotal, variantIds) =>
    set({ itemCount, subtotal, ...(variantIds && { variantIds }) }),

  addItem: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.id === item.id);
      const updated = existing
        ? s.items.map((i) =>
            i.id === item.id ? { ...i, quantity: item.quantity } : i,
          )
        : [...s.items, item];
      return totals(updated);
    }),

  removeItem: (itemId) =>
    set((s) => totals(s.items.filter((i) => i.id !== itemId))),

  updateQuantity: (itemId, quantity) =>
    set((s) =>
      totals(
        quantity <= 0
          ? s.items.filter((i) => i.id !== itemId)
          : s.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
      ),
    ),

  clearCart: () =>
    set({ items: [], itemCount: 0, subtotal: 0, variantIds: [] }),
}));

/** Whether this variant is already in the cart (account or guest). */
export const useInCart = (variantId?: string | null) =>
  useCartStore((s) => !!variantId && s.variantIds.includes(variantId));
