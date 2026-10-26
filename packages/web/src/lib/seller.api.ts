import { api } from "./api";
import type { ApiResponse, SellerProfile } from "./types";

export interface SellerProfilePayload {
  storeName: string;
  storeSlug: string;
  storeDescription?: string;
  storeLogo?: string;
}

export async function getSellerProfile(): Promise<SellerProfile> {
  const { data } = await api.get<ApiResponse<SellerProfile>>("/sellers/me");
  return data.data;
}

/** Creates the store. The server upgrades the user's role to seller. */
export async function createSellerProfile(
  payload: SellerProfilePayload,
): Promise<SellerProfile> {
  const { data } = await api.post<ApiResponse<SellerProfile>>(
    "/sellers/onboard",
    payload,
  );
  return data.data;
}

export async function updateSellerProfile(
  payload: Partial<SellerProfilePayload>,
): Promise<SellerProfile> {
  const { data } = await api.patch<ApiResponse<SellerProfile>>(
    "/sellers/me",
    payload,
  );
  return data.data;
}

export async function uploadVerificationDoc(docUrl: string): Promise<void> {
  await api.post("/sellers/me/verification-docs", { docUrl });
}
