import { api } from "./api";

export interface DeliveryEstimate {
  minDays: number;
  maxDays: number;
  fee: number;
  provider: string;
}

export async function getDeliveryEstimate(payload: {
  addressId: string;
  cartId?: string;
}): Promise<DeliveryEstimate> {
  const { data } = await api.post("/delivery/estimate", payload);
  return data;
}
