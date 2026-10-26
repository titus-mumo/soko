import { api } from "./api";
import { getPage, type Paged, type PageRequest } from "./paging";
import type { ApiResponse, Review } from "./types";

export function getProductReviews(
  productId: string,
  page?: PageRequest,
): Promise<Paged<Review>> {
  return getPage<Review>(`/reviews/product/${productId}`, page);
}

export async function getAverageProductRating(
  productId: string,
): Promise<number> {
  const { data } = await api.get<
    ApiResponse<{ averageRating: number | string | null }>
  >(`/reviews/product/${productId}/rating`);
  return Number(data.data.averageRating ?? 0);
}

export function getMyReviews(page?: PageRequest): Promise<Paged<Review>> {
  return getPage<Review>("/reviews/me", page);
}

export async function createReview(payload: {
  orderItemId: string;
  rating: number;
  comment?: string;
}): Promise<void> {
  await api.post("/reviews/me", payload);
}

export async function updateReviewComment(
  reviewId: string,
  comment: string,
): Promise<void> {
  await api.patch(`/reviews/me/${reviewId}`, { comment });
}

export async function deleteReview(reviewId: string): Promise<void> {
  await api.delete(`/reviews/me/${reviewId}`);
}
