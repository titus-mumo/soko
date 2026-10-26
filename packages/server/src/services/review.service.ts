import { getRepositories } from "../lib/repositories";
import type { PageParams } from "db-operations";
import { anyContactInfo } from "../lib/contact-filter";

const {
  reviewRepository,
  orderItemRepository,
  orderRepository,
  productVariantRepository,
  sellerProfileRepository,
  notificationRepository,
} = getRepositories();

// ─────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────

// Only allows a review if the order item has been delivered —
// prevents reviews on undelivered or cancelled items.
export async function createReview(
  userId: string,
  data: {
    orderItemId: string;
    rating: number;
    comment?: string;
  },
): Promise<
  | "order_item_not_found"
  | "order_not_delivered"
  | "already_reviewed"
  | "invalid_rating"
  | "contact_info"
  | "review_created"
> {
  // Validate rating is between 1 and 5.
  if (data.rating < 1 || data.rating > 5) return "invalid_rating";
  if (anyContactInfo(data.comment)) return "contact_info";

  const orderItem = await orderItemRepository.findOrderItemById(
    data.orderItemId,
  );
  if (orderItem === "order_item_not_found") return "order_item_not_found";

  // Confirm the order item belongs to the buyer via the order.
  const order = await orderRepository.findOrderById(orderItem.orderId);

  if (order === "order_not_found" || order.buyerId !== userId) {
    return "order_item_not_found";
  }

  // Only delivered items can be reviewed.
  if (orderItem.status !== "delivered") return "order_not_delivered";

  // Enforce one review per order item per buyer.
  const existing = await reviewRepository.findReviewByOrderItemId(
    data.orderItemId,
    userId,
  );
  if (existing !== "review_not_found") return "already_reviewed";

  // Order items reference a variant, not a product — resolve the product
  // through it.
  const variant = await productVariantRepository.findVariantById(
    orderItem.productVariantId,
  );
  if (variant === "variant_not_found") return "order_item_not_found";

  const review = await reviewRepository.insertReview({
    orderItemId: data.orderItemId,
    reviewerId: userId,
    sellerId: orderItem.sellerId,
    productId: variant.productId,
    rating: data.rating,
    comment: data.comment,
    isVerifiedPurchase: true,
  });

  if (!review) throw new Error("Failed to create review");

  // Order items carry the seller *profile* id; rating updates and
  // notifications are keyed by the seller's *user* id.
  const seller = await sellerProfileRepository.findSellerProfileById(
    orderItem.sellerId,
  );
  if (seller === "seller_not_found") return "review_created";

  // Recompute and update the seller's average rating after every new review.
  const avgRating = await reviewRepository.getAverageRatingForSeller(
    orderItem.sellerId,
  );

  if (avgRating) {
    await sellerProfileRepository.updateRating(
      seller.userId,
      parseFloat(avgRating).toFixed(2),
    );
  }

  // Notify the seller of the new review.
  await notificationRepository.insertNotification({
    userId: seller.userId,
    type: "new_review",
    title: "New Review",
    body: `A buyer left a ${data.rating}-star review on one of your products.`,
    channel: "push",
  });

  return "review_created";
}

export async function getProductReviews(productId: string, page?: PageParams) {
  return await reviewRepository.pageReviews({ productId }, page);
}

export async function getSellerReviews(sellerId: string, page?: PageParams) {
  return await reviewRepository.pageReviews({ sellerId }, page);
}

export async function getBuyerReviews(userId: string, page?: PageParams) {
  return await reviewRepository.pageReviews({ reviewerId: userId }, page);
}

export async function getAverageProductRating(productId: string) {
  const avg = await reviewRepository.getAverageRatingForProduct(productId);
  return avg ? parseFloat(avg).toFixed(2) : "0.00";
}

export async function getAverageSellerRating(sellerId: string) {
  const avg = await reviewRepository.getAverageRatingForSeller(sellerId);
  return avg ? parseFloat(avg).toFixed(2) : "0.00";
}

// Only the comment is editable — rating is immutable after submission.
export async function updateReviewComment(
  userId: string,
  reviewId: string,
  comment: string,
): Promise<"review_not_found" | "comment_updated"> {
  const result = await reviewRepository.updateReviewComment(
    reviewId,
    userId,
    comment,
  );

  if (result === "review_not_found") return "review_not_found";

  return "comment_updated";
}

export async function deleteReview(
  userId: string,
  reviewId: string,
): Promise<"review_not_found" | "review_deleted"> {
  const result = await reviewRepository.softDeleteReview(reviewId, userId);
  if (!result) return "review_not_found";

  return "review_deleted";
}

// Admin only — removes reviews that violate platform policy.
export async function adminDeleteReview(
  reviewId: string,
): Promise<"review_not_found" | "review_deleted"> {
  const result = await reviewRepository.hardDeleteReview(reviewId);
  if (!result) return "review_not_found";
  return "review_deleted";
}
