import { api } from "./api";
import type { CartItem } from "./types";

export async function getCart(): Promise<CartItem[]> {
  const { data } = await api.get("/cart");
  return data.data;
}

export async function addToCart(payload: {
  productVariantId: string;
  quantity?: number;
}): Promise<CartItem[]> {
  await api.post("/cart", payload);
  // re-fetch the cart after mutation to get the latest state
  return getCart();
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<CartItem[]> {
  await api.patch(`/cart/${cartItemId}/quantity`, { quantity });
  return getCart();
}

export async function removeCartItem(cartItemId: string): Promise<CartItem[]> {
  await api.delete(`/cart/${cartItemId}`);
  return getCart();
}

export async function clearCart(): Promise<void> {
  await api.delete("/cart");
}
