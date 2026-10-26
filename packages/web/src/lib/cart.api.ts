import { api } from "./api";
import { getVariantDetailsMap } from "./products.api";
import type { ApiResponse, CartItem, CartLine, CartSummary } from "./types";

export async function getCartItems(): Promise<CartItem[]> {
  const { data } = await api.get<ApiResponse<CartItem[]>>("/cart");
  return data.data;
}

export async function getCartSummary(): Promise<CartSummary> {
  const { data } = await api.get<ApiResponse<CartSummary>>("/cart/summary");
  return data.data;
}

/**
 * Cart summary with each item's variant + product resolved. A user who has
 * never added anything has no cart yet (404) — that's an empty cart.
 */
export async function getCartWithDetails(): Promise<{
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
}> {
  let summary: CartSummary;
  try {
    summary = await getCartSummary();
  } catch (err) {
    if ((err as { response?: { status?: number } }).response?.status === 404) {
      return { lines: [], itemCount: 0, subtotal: 0 };
    }
    throw err;
  }
  const details = await getVariantDetailsMap(
    summary.items.map((i) => i.productVariantId),
  );
  return {
    lines: summary.items.map((i) => ({
      ...i,
      details: details[i.productVariantId],
    })),
    itemCount: summary.itemCount,
    subtotal: Number(summary.subtotal),
  };
}

export async function addToCart(
  payload: { productVariantId: string; quantity?: number },
  options?: { skipAuthRedirect?: boolean },
): Promise<CartItem> {
  const { data } = await api.post<ApiResponse<CartItem>>(
    "/cart",
    payload,
    options,
  );
  return data.data;
}

/** Sets an absolute quantity. A quantity of 0 removes the item. */
export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<void> {
  await api.patch(`/cart/${cartItemId}/quantity`, { quantity });
}

/** Changes quantity by a relative amount (e.g. +1 / -1). */
export async function adjustCartItemQuantity(
  cartItemId: string,
  delta: number,
): Promise<void> {
  await api.patch(`/cart/${cartItemId}/adjust`, { delta });
}

export async function removeCartItem(cartItemId: string): Promise<void> {
  await api.delete(`/cart/${cartItemId}`);
}

export async function clearCart(): Promise<void> {
  await api.delete("/cart");
}
