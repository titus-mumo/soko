import { api } from "./api";
import type { SellerProfile } from "./types";

export interface SellerOnboardPayload {
  storeName: string;
  storeSlug: string;
  storeDescription?: string;
  storeLogo?: string;
}

export interface SellerStats {
  totalSales: number;
  activeListings: number;
  pendingOrders: number;
  totalRevenue: number;
}

export async function getSellerProfile(): Promise<SellerProfile> {
  const { data } = await api.get("/sellers/me");
  return data.data;
}

export async function createSellerProfile(
  payload: SellerOnboardPayload,
): Promise<SellerProfile> {
  const { data } = await api.post("/sellers/onboard", payload);
  return data.data;
}

export async function updateSellerProfile(
  payload: Partial<SellerOnboardPayload>,
): Promise<SellerProfile> {
  const { data } = await api.patch("/sellers/me", payload);
  return data.data;
}
