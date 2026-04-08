import { api } from "./api";

export interface PaymentRecord {
  id: string;
  orderId: string;
  status: "pending" | "paid" | "failed" | "refunded";
  amount: string;
  phone?: string;
  createdAt: string;
}

export async function initiatePayment(
  orderId: string,
  phone: string,
): Promise<void> {
  await api.post("/payments/me/initiate", { orderId, phone });
}

export async function getPaymentByOrderId(
  orderId: string,
): Promise<PaymentRecord> {
  const { data } = await api.get(`/payments/me/${orderId}`);
  return data.data;
}
