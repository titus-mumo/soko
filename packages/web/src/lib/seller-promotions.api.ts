import { api } from "./api";
import { getPage, type Paged, type PageRequest } from "./paging";
import type { ApiResponse } from "./types";

export interface SellerPromotion {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrderAmount?: string;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export function getSellerPromotions(
  page?: PageRequest,
): Promise<Paged<SellerPromotion>> {
  return getPage<SellerPromotion>("/promotions/seller", page);
}

export async function createSellerPromotion(payload: {
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrderAmount?: string;
  maxUses?: number;
  expiresAt?: string;
}): Promise<SellerPromotion> {
  const { data } = await api.post<ApiResponse<SellerPromotion>>(
    "/promotions/seller",
    payload,
  );
  return data.data;
}

export async function updateSellerPromotion(
  promotionId: string,
  payload: {
    code?: string;
    type?: "percent" | "fixed";
    value?: string;
    minOrderAmount?: string;
    maxUses?: number;
    expiresAt?: string;
    isActive?: boolean;
  },
): Promise<SellerPromotion> {
  const { data } = await api.patch<ApiResponse<SellerPromotion>>(
    `/promotions/seller/${promotionId}`,
    payload,
  );
  return data.data;
}

export async function activateSellerPromotion(
  promotionId: string,
): Promise<void> {
  await api.patch(`/promotions/seller/${promotionId}/activate`);
}

export async function deactivateSellerPromotion(
  promotionId: string,
): Promise<void> {
  await api.patch(`/promotions/seller/${promotionId}/deactivate`);
}

export async function deleteSellerPromotion(
  promotionId: string,
): Promise<void> {
  await api.delete(`/promotions/seller/${promotionId}`);
}
