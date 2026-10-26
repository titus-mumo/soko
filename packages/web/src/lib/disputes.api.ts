import { api } from "./api";
import { getPage, type Paged, type PageRequest } from "./paging";
import type { ApiResponse } from "./types";

export type DisputeStatus = "open" | "under_review" | "resolved" | "closed";

export interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  reason: string;
  description?: string;
  status: DisputeStatus;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export function getMyDisputes(page?: PageRequest): Promise<Paged<Dispute>> {
  return getPage<Dispute>("/disputes/me", page);
}

export async function getDisputesByOrder(orderId: string): Promise<Dispute[]> {
  const { data } = await api.get<ApiResponse<Dispute[]>>(
    `/disputes/me/order/${orderId}`,
  );
  return data.data;
}

export async function raiseDispute(payload: {
  orderId: string;
  reason: string;
  description?: string;
}): Promise<void> {
  await api.post("/disputes/me", payload);
}
