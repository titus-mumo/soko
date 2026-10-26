// A cart for shoppers who haven't signed in yet, kept in this browser. On
// sign-in it's merged into the account's server cart (which is what follows
// the user across devices) and cleared here.

import { addToCart } from "./cart.api";
import { getVariantDetails } from "./products.api";
import { availableOf } from "./stock";
import { syncCartTotals } from "./sync";
import { apiErrorMessage } from "./utils";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { toast } from "@/store/toast.store";

export interface GuestLine {
  variantId: string;
  quantity: number;
}

const KEY = "soko:guest-cart";

export function getGuestLines(): GuestLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          (l) => typeof l?.variantId === "string" && Number(l?.quantity) > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function write(lines: GuestLine[]) {
  try {
    if (lines.length) localStorage.setItem(KEY, JSON.stringify(lines));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked — the item just won't survive sign-in
  }
  syncGuestCartBadge();
}

export function guestCartCount(): number {
  return getGuestLines().reduce((n, l) => n + l.quantity, 0);
}

/** Shows the guest cart's size on the cart badge. */
export function syncGuestCartBadge() {
  if (useAuthStore.getState().user) return;
  useCartStore.getState().setTotals(guestCartCount(), 0);
}

/** Adds to the guest cart; same variant twice adds up, like the server cart. */
export function addGuestItem(variantId: string, quantity: number) {
  const lines = getGuestLines();
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) existing.quantity += quantity;
  else lines.push({ variantId, quantity });
  write(lines);
}

/** Sets a line's quantity; 0 removes it. */
export function setGuestQuantity(variantId: string, quantity: number) {
  write(
    getGuestLines()
      .map((l) => (l.variantId === variantId ? { ...l, quantity } : l))
      .filter((l) => l.quantity > 0),
  );
}

export function clearGuestCart() {
  write([]);
}

/**
 * Adds to whichever cart applies: the account's server cart when signed in,
 * otherwise this browser's guest cart. Never sends anyone to log in — if
 * the saved session turns out to have expired, the item lands in the guest
 * cart and moves to the account at the next sign-in.
 */
export async function addToAnyCart(
  variantId: string,
  quantity: number,
): Promise<"account" | "guest"> {
  if (useAuthStore.getState().user) {
    try {
      await addToCart(
        { productVariantId: variantId, quantity },
        { skipAuthRedirect: true },
      );
      await syncCartTotals();
      return "account";
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      // Anything but an expired session (stock, own listing…) is a real error.
      if (status !== 401) throw err;
    }
  }
  // Same rule as the server: the line can't exceed what's left.
  const available = availableOf((await getVariantDetails(variantId)).variant);
  const inCart =
    getGuestLines().find((l) => l.variantId === variantId)?.quantity ?? 0;
  if (inCart + quantity > available)
    throw stockError(
      available <= 0
        ? "This item is out of stock."
        : inCart >= available
          ? `You already have all ${available} available in your cart.`
          : available === 1
            ? "Only 1 left."
            : `Only ${available} left.`,
    );
  addGuestItem(variantId, quantity);
  return "guest";
}

/** An error callers can show with apiErrorMessage, like a server refusal. */
function stockError(message: string) {
  return Object.assign(new Error(message), {
    response: { data: { message, code: "INSUFFICIENT_STOCK" } },
  });
}

type StockRefusal = { code?: string; available?: number; inCart?: number };

/**
 * Moves the guest cart into the signed-in user's server cart. Lines the
 * server refuses (out of stock, the seller's own listing) are dropped and
 * reported. Safe to call any time — does nothing when the guest cart is empty.
 */
export async function mergeGuestCart(): Promise<{
  merged: number;
  failed: string[];
}> {
  const lines = getGuestLines();
  if (!lines.length) return { merged: 0, failed: [] };
  // Clear first so a second caller (two shells mounting) can't double-add.
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }

  let merged = 0;
  const failed: string[] = [];
  for (const line of lines) {
    try {
      await addToCart({
        productVariantId: line.variantId,
        quantity: line.quantity,
      });
      merged += line.quantity;
    } catch (err) {
      // Less is left than the guest cart had: add what still fits.
      const refusal = (err as { response?: { data?: StockRefusal } }).response
        ?.data;
      const room =
        refusal?.code === "INSUFFICIENT_STOCK"
          ? (refusal.available ?? 0) - (refusal.inCart ?? 0)
          : 0;
      if (room > 0) {
        try {
          await addToCart({ productVariantId: line.variantId, quantity: room });
          merged += room;
          failed.push(
            `Only ${room} of ${line.quantity} of an item could be added — that's all that's left.`,
          );
          continue;
        } catch {
          // fall through to the original reason
        }
      }
      failed.push(apiErrorMessage(err, "An item couldn't be added"));
    }
  }
  return { merged, failed };
}

/**
 * After sign-in: moves anything added while signed out into the account's
 * cart, tells the user, then refreshes the badge. Never throws.
 */
export async function adoptGuestCart(): Promise<void> {
  try {
    const { merged, failed } = await mergeGuestCart();
    if (merged > 0)
      toast.success(
        `${merged} item${merged === 1 ? "" : "s"} you added before signing in ${merged === 1 ? "is" : "are"} in your cart`,
      );
    for (const message of failed) toast.error(message);
  } finally {
    await syncCartTotals();
  }
}
