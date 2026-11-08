import { getRepositories } from "../lib/repositories";
import type { PageParams } from "db-operations";
import type { NewPromotion } from "db-operations";

const { promotionRepository } = getRepositories();

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

export type PromoProblem =
  | "promotion_not_found"
  | "promotion_inactive"
  | "promotion_expired"
  | "promotion_exhausted"
  | "minimum_order_not_met";

// Validates a promotion against an order amount and returns
// the discount value if valid. Used by the preview and at checkout.
export async function validatePromotion(
  code: string,
  orderAmount: number,
): Promise<
  | "promotion_not_found"
  | "promotion_inactive"
  | "promotion_expired"
  | "promotion_exhausted"
  | "minimum_order_not_met"
  | { promotionId: string; discount: number; finalAmount: number }
> {
  const promotion = await promotionRepository.findPromotionByCode(code);
  if (promotion === "promotion_not_found") return "promotion_not_found";

  // Check promotion is active.
  if (!promotion.isActive) return "promotion_inactive";

  // Check promotion hasn't expired.
  if (promotion.expiresAt && promotion.expiresAt < new Date()) {
    return "promotion_expired";
  }

  // Check promotion hasn't hit its max uses limit.
  if (
    promotion.maxUses !== null &&
    promotion.maxUses !== undefined &&
    promotion.usesCount >= promotion.maxUses
  ) {
    return "promotion_exhausted";
  }

  // Check the order meets the minimum order amount.
  if (
    promotion.minOrderAmount &&
    orderAmount < parseFloat(promotion.minOrderAmount)
  ) {
    return "minimum_order_not_met";
  }

  // Compute the discount based on promotion type.
  let discount = 0;

  if (promotion.type === "percent") {
    // Percent discount — cap at 100% to prevent negative totals.
    const percent = Math.min(parseFloat(promotion.value), 100);
    discount = (orderAmount * percent) / 100;
  } else {
    // Fixed discount — cap at the order amount to prevent negative totals.
    discount = Math.min(parseFloat(promotion.value), orderAmount);
  }

  const finalAmount = Math.max(orderAmount - discount, 0);

  return {
    promotionId: promotion.id,
    discount: parseFloat(discount.toFixed(2)),
    finalAmount: parseFloat(finalAmount.toFixed(2)),
  };
}

// ─────────────────────────────────────────
// Seller Promotions
// ─────────────────────────────────────────

// Request bodies carry expiresAt as an ISO string; the column needs a Date.
function toDate(value: Date | string | null | undefined) {
  if (value === undefined || value === null) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid expiresAt date");
  return date;
}

// ─────────────────────────────────────────
// Admin management (stores can no longer run their own promotions)
// ─────────────────────────────────────────

export async function setPromotionActive(
  promotionId: string,
  active: boolean,
): Promise<"promotion_not_found" | "promotion_updated"> {
  const result = active
    ? await promotionRepository.activatePromotion(promotionId)
    : await promotionRepository.deactivatePromotion(promotionId);
  return result === "promotion_not_found"
    ? "promotion_not_found"
    : "promotion_updated";
}

export async function deletePromotion(
  promotionId: string,
): Promise<"promotion_not_found" | "promotion_deleted"> {
  const result = await promotionRepository.softDeletePromotion(promotionId);
  return result ? "promotion_deleted" : "promotion_not_found";
}

// ─────────────────────────────────────────
// Platform Promotions (Admin)
// ─────────────────────────────────────────

// Creates a platform-wide promotion not tied to any specific seller.
export async function createPlatformPromotion(
  data: Pick<
    NewPromotion,
    "code" | "type" | "value" | "minOrderAmount" | "maxUses" | "expiresAt"
  >,
): Promise<
  | "code_taken"
  | "invalid_value"
  | Awaited<ReturnType<typeof promotionRepository.insertPromotion>>
> {
  const value = Number(data.value);
  const max = data.type === "percent" ? 100 : Infinity;
  if (!Number.isFinite(value) || value <= 0 || value > max)
    return "invalid_value";

  const existing = await promotionRepository.findPromotionByCode(data.code);
  if (existing !== "promotion_not_found") return "code_taken";

  // sellerId is null for platform-wide promotions.
  return await promotionRepository.insertPromotion({
    sellerId: null,
    ...data,
    expiresAt: toDate(data.expiresAt),
  });
}

export async function getPlatformPromotions(page?: PageParams) {
  return await promotionRepository.pagePromotions(null, page);
}

// Previews the discount without incrementing usesCount.
// Use this for a "check promo code" UI before the buyer commits to checkout.
export async function previewPromoCode(
  code: string,
  orderAmount: number,
): Promise<
  | "promotion_not_found"
  | "promotion_inactive"
  | "promotion_expired"
  | "promotion_exhausted"
  | "minimum_order_not_met"
  | { discount: number; finalAmount: number }
> {
  const result = await validatePromotion(code, orderAmount);

  if (typeof result === "string") return result;

  return {
    discount: result.discount,
    finalAmount: result.finalAmount,
  };
}
