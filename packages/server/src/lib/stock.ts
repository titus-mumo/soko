import { STOCK_SHOWN_MAX } from "./views";
// Items in a cart are held for the shopper: other shoppers can only add what
// isn't held. A hold lasts this long after the shopper last touched their
// cart (adding, changing quantities, or opening the cart renews it), so an
// abandoned cart can't block stock forever.
export const CART_HOLD_MINUTES = 60;

/** The shopper-facing reason a quantity can't be added. */
export function stockMessage(available: number, inCart = 0): string {
  if (available <= 0) return "This item is out of stock.";
  // Don't reveal large stock levels (see STOCK_SHOWN_MAX).
  if (available > STOCK_SHOWN_MAX)
    return "There isn't enough stock for that quantity.";
  if (inCart >= available)
    return `You already have all ${available} available in your cart.`;
  const left = available === 1 ? "Only 1 left." : `Only ${available} left.`;
  return inCart > 0
    ? `${left.slice(0, -1)}, and ${inCart} ${inCart === 1 ? "is" : "are"} already in your cart.`
    : left;
}
