import { api } from "./api";
import type { ApiResponse } from "./types";

export interface PromoPreview {
  discount: number;
  finalAmount: number;
}

/** Validates a promo code against an order amount without redeeming it. */
export async function previewPromoCode(
  code: string,
  orderAmount: number,
): Promise<PromoPreview> {
  const { data } = await api.post<ApiResponse<PromoPreview>>(
    "/promotions/preview",
    { code, orderAmount },
  );
  return data.data;
}

// A code applied on the cart page, carried to checkout for this tab only.
const PROMO_KEY = "soko:promo-code";

export function savePendingPromo(code: string | null): void {
  try {
    if (code) sessionStorage.setItem(PROMO_KEY, code);
    else sessionStorage.removeItem(PROMO_KEY);
  } catch {
    // storage blocked — the buyer can re-enter it at checkout
  }
}

export function loadPendingPromo(): string | null {
  try {
    return sessionStorage.getItem(PROMO_KEY);
  } catch {
    return null;
  }
}
