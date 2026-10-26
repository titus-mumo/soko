import type { ProductVariant } from "./types";

/** How many of a variant shoppers can still add (cart holds excluded). */
export function availableOf(
  v: Pick<ProductVariant, "stockQuantity" | "availableQuantity">,
): number {
  return Math.max(0, v.availableQuantity ?? v.stockQuantity ?? 0);
}

/** Show "Only N left" at or below this. */
export const LOW_STOCK = 5;
