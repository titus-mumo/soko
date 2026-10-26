import { getCartSummary } from "./cart.api";
import { getUnreadCount } from "./notifications.api";
import { useCartStore } from "@/store/cart.store";
import { useNotificationStore } from "@/store/notification.store";

/** Refreshes the cart badge from the server. Never throws. */
export async function syncCartTotals(): Promise<void> {
  try {
    const summary = await getCartSummary();
    useCartStore
      .getState()
      .setTotals(summary.itemCount, Number(summary.subtotal));
  } catch {
    // A user with no cart yet gets a 404 here.
    useCartStore.getState().setTotals(0, 0);
  }
}

/** Refreshes the unread notifications badge. Never throws. */
export async function syncUnreadCount(): Promise<void> {
  try {
    useNotificationStore.getState().setUnreadCount(await getUnreadCount());
  } catch {
    // leave the current count
  }
}
