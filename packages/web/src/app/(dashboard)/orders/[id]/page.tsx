"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrderById, cancelOrder } from "@/lib/orders.api";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/toast.store";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    getOrderById(id)
      .then(setOrder)
      .catch(() => toast.error("Failed to load order"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const updated = await cancelOrder(id);
      setOrder(updated);
      toast.success("Order cancelled");
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
      setShowCancel(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48 rounded-md" />
        <Skeleton className="h-32 rounded-md" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-zinc-400 dark:text-zinc-600">
          Order not found
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/orders")}
        >
          Back to orders
        </Button>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(
    order.status as (typeof STATUS_STEPS)[number],
  );
  const canCancel = order.status === "pending" || order.status === "confirmed";

  const getItemName = (item: Order["items"][number]) =>
    item.variant?.product?.name ?? `Item ${item.id.slice(-4)}`;

  const getItemVariantLabel = (item: Order["items"][number]) =>
    [item.variant?.size, item.variant?.color].filter(Boolean).join(" / ") ||
    item.variant?.sku;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <button
        onClick={() => router.push("/orders")}
        className="flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Orders
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Order #{order.id.slice(-6).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {/* Shipment timeline */}
      {order.status !== "cancelled" && order.status !== "refunded" && (
        <div className="rounded-md border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            Shipment
          </p>
          <div className="relative flex justify-between">
            <div className="absolute top-3 left-0 right-0 h-px bg-zinc-100 dark:bg-zinc-800" />
            {STATUS_STEPS.map((step, i) => {
              const done = currentStepIndex >= 0 && i <= currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <div
                  key={step}
                  className="relative flex flex-col items-center gap-2"
                >
                  <div
                    className={`z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                      done
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600"
                    }`}
                  >
                    {done && !active ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs capitalize ${active ? "font-semibold text-blue-600 dark:text-blue-400" : done ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-600"}`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-md border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <p className="border-b border-zinc-100 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
          Items
        </p>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {getItemName(item)}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  {getItemVariantLabel(item) &&
                    `${getItemVariantLabel(item)} · `}
                  Qty {item.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                KES {Number(item.totalPrice).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Subtotal</span>
            <span>KES {Number(order.subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Delivery</span>
            <span>KES {Number(order.deliveryFee).toLocaleString()}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
              <span>Discount</span>
              <span>−KES {Number(order.discount).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-100 pt-2 text-sm font-semibold dark:border-zinc-800">
            <span className="text-zinc-800 dark:text-zinc-200">Total</span>
            <span className="text-zinc-900 dark:text-zinc-50">
              KES {Number(order.total).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      {order.deliveryAddress && (
        <div className="rounded-md border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            Delivery address
          </p>
          {order.deliveryAddress.street && (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {order.deliveryAddress.street}
            </p>
          )}
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {order.deliveryAddress.town}, {order.deliveryAddress.county}
          </p>
        </div>
      )}

      {canCancel && (
        <Button
          variant="ghost"
          className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
          onClick={() => setShowCancel(true)}
        >
          Cancel order
        </Button>
      )}

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel order"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Are you sure you want to cancel this order?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCancel(false)}>
            No, keep it
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            isLoading={cancelling}
            onClick={handleCancel}
          >
            Cancel order
          </Button>
        </div>
      </Modal>
    </div>
  );
}
