"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getPaymentByOrderId } from "@/lib/payments.api";
import { useCartStore } from "@/store/cart.store";
import { Button } from "@/components/ui/Button";

type PaymentState = "pending" | "paid" | "failed";

export default function CheckoutPendingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId") ?? "";
  const clearCart = useCartStore((s) => s.clear);
  const [state, setState] = useState<PaymentState>("pending");
  const [polling, setPolling] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await getPaymentByOrderId(orderId);
      if (res.status === "paid") {
        setState("paid");
        setPolling(false);
        clearCart();
      } else if (res.status === "failed") {
        setState("failed");
        setPolling(false);
      }
    } catch {
      // keep polling — payment record may not exist yet
    }
  }, [orderId, clearCart]);

  useEffect(() => {
    if (!polling) return;
    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    const timeout = setTimeout(() => {
      setPolling(false);
      clearInterval(interval);
    }, 90000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [polling, checkStatus]);

  return (
    <div className="flex min-h-[calc(100vh-112px)] items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {state === "pending" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <span className="text-3xl">📱</span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Check your phone
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              An M-Pesa payment request has been sent. Enter your PIN to
              complete.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600 dark:border-zinc-700" />
              Waiting for payment…
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-6 text-zinc-400"
              onClick={() => router.push(`/orders/${orderId}`)}
            >
              Check order status later
            </Button>
          </>
        )}

        {state === "paid" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-600 dark:text-green-400"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Payment confirmed
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Your order has been placed successfully.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push(`/orders/${orderId}`)}
            >
              View order
            </Button>
          </>
        )}

        {state === "failed" && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-600 dark:text-red-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Payment failed
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              The payment could not be processed.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => router.push("/checkout")}
              >
                Try again
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push(`/orders/${orderId}`)}
              >
                View order
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
