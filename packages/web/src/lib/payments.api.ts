import { api } from "./api";
import type { ApiResponse, Payment } from "./types";

/** Triggers an M-Pesa STK push to `phone` for the given order. */
export async function initiatePayment(
  orderId: string,
  phone: string,
): Promise<void> {
  await api.post("/payments/me/initiate", { orderId, phone });
}

export async function getPaymentByOrderId(orderId: string): Promise<Payment> {
  const { data } = await api.get<ApiResponse<Payment>>(
    `/payments/me/${orderId}`,
  );
  return data.data;
}
