import { getRepositories } from "../lib/repositories";
import type { NewPromotion } from "db-operations";

const {
  promotionRepository,
  orderRepository,
  sellerProfileRepository,
  notificationRepository,
} = getRepositories();

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

// Validates a promotion against an order amount and returns
// the discount value if valid. Called internally at checkout.
async function validatePromotion(
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

export async function createPromotion(
  userId: string,
  data: Pick<
    NewPromotion,
    "code" | "type" | "value" | "minOrderAmount" | "maxUses" | "expiresAt"
  >,
): Promise<
  | "seller_not_found"
  | "code_taken"
  | Awaited<ReturnType<typeof promotionRepository.insertPromotion>>
> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  // Ensure promo code is unique across the platform.
  const existing = await promotionRepository.findPromotionByCode(data.code);
  if (existing !== "promotion_not_found") return "code_taken";

  return await promotionRepository.insertPromotion({
    sellerId: seller.id,
    ...data,
  });
}

export async function getSellerPromotions(userId: string) {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found" as const;

  return await promotionRepository.findPromotionsBySellerId(seller.id);
}

export async function updatePromotion(
  userId: string,
  promotionId: string,
  data: Partial<
    Pick<
      NewPromotion,
      | "code"
      | "type"
      | "value"
      | "minOrderAmount"
      | "maxUses"
      | "expiresAt"
      | "isActive"
    >
  >,
): Promise<
  | "seller_not_found"
  | "promotion_not_found"
  | "code_taken"
  | Awaited<ReturnType<typeof promotionRepository.updatePromotion>>
> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  // Ensure the new code isn't already taken by another promotion.
  if (data.code) {
    const existing = await promotionRepository.findPromotionByCode(data.code);
    if (
      existing !== "promotion_not_found" &&
      (existing as any).id !== promotionId
    ) {
      return "code_taken";
    }
  }

  return await promotionRepository.updatePromotion(promotionId, data);
}

export async function activatePromotion(
  userId: string,
  promotionId: string,
): Promise<"seller_not_found" | "promotion_not_found" | "promotion_activated"> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  const result = await promotionRepository.activatePromotion(promotionId);
  if (result === "promotion_not_found") return "promotion_not_found";

  return "promotion_activated";
}

export async function deactivatePromotion(
  userId: string,
  promotionId: string,
): Promise<
  "seller_not_found" | "promotion_not_found" | "promotion_deactivated"
> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  const result = await promotionRepository.deactivatePromotion(promotionId);
  if (result === "promotion_not_found") return "promotion_not_found";

  return "promotion_deactivated";
}

export async function deletePromotion(
  userId: string,
  promotionId: string,
): Promise<"seller_not_found" | "promotion_not_found" | "promotion_deleted"> {
  const seller =
    await sellerProfileRepository.findSellerProfileByUserId(userId);
  if (seller === "seller_not_found") return "seller_not_found";

  const result = await promotionRepository.softDeletePromotion(promotionId);
  if (!result) return "promotion_not_found";

  return "promotion_deleted";
}

// ─────────────────────────────────────────
// Checkout — Apply Promo Code
// ─────────────────────────────────────────

// Validates and applies a promo code to an order at checkout.
// Call this before finalising the order total.
export async function applyPromoCode(
  userId: string,
  orderId: string,
  code: string,
): Promise<
  | "order_not_found"
  | "promotion_not_found"
  | "promotion_inactive"
  | "promotion_expired"
  | "promotion_exhausted"
  | "minimum_order_not_met"
  | { discount: number; finalAmount: number }
> {
  const order = await orderRepository.findOrderByIdAndBuyerId(orderId, userId);
  if (order === "order_not_found") return "order_not_found";

  const result = await validatePromotion(code, parseFloat(order.totalAmount));

  if (typeof result === "string") return result;

  // Atomically increment usesCount to prevent over-redemption
  // under concurrent requests.
  await promotionRepository.incrementUsesCount(result.promotionId);

  // Notify the buyer of the applied discount.
  await notificationRepository.insertNotification({
    userId,
    type: "promo_applied",
    title: "Promo Code Applied!",
    body: `You saved KES ${result.discount.toFixed(2)} on your order.`,
    channel: "push",
  });

  return {
    discount: result.discount,
    finalAmount: result.finalAmount,
  };
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
  "code_taken" | Awaited<ReturnType<typeof promotionRepository.insertPromotion>>
> {
  const existing = await promotionRepository.findPromotionByCode(data.code);
  if (existing !== "promotion_not_found") return "code_taken";

  // sellerId is null for platform-wide promotions.
  return await promotionRepository.insertPromotion({
    sellerId: null,
    ...data,
  });
}

export async function getPlatformPromotions() {
  return await promotionRepository.findPlatformPromotions();
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
