"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAddresses } from "@/lib/profile.api";
import { createOrder } from "@/lib/orders.api";
import { initiatePayment } from "@/lib/payments.api";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  checkoutSchema,
  type CheckoutValues,
} from "@/lib/validations/checkout";
import type { Address } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAddresses()
      .then(setAddresses)
      .finally(() => setLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { deliveryAddressId: "", promoCode: "", notes: "" },
  });

  const onSubmit = async (values: CheckoutValues) => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!user?.phone) {
      toast.error("Add a phone number to your profile before paying");
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        deliveryAddressId: values.deliveryAddressId,
        promotionCode: values.promoCode || undefined,
        notes: values.notes || undefined,
      });
      await initiatePayment(order.id, user.phone);
      router.push(`/checkout/pending?orderId=${order.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Failed to place order";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && items.length === 0) {
    router.replace("/cart");
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Checkout
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
              Delivery
            </p>
            {loading ? (
              <Skeleton className="h-9 rounded" />
            ) : addresses.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400">
                No saved addresses.{" "}
                <a href="/profile/addresses" className="underline">
                  Add one first.
                </a>
              </div>
            ) : (
              <Select
                label="Delivery address"
                placeholder="Select address"
                error={errors.deliveryAddressId?.message}
                {...register("deliveryAddressId")}
              >
                {addresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {addr.label} — {addr.town}, {addr.county}
                    {addr.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <Input
            label="Promo code (optional)"
            placeholder="SOKO2024"
            error={errors.promoCode?.message}
            {...register("promoCode")}
          />

          <Input
            label="Order notes (optional)"
            placeholder="Any special instructions…"
            error={errors.notes?.message}
            {...register("notes")}
          />

          {!user?.phone && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400">
              Add a phone number to your{" "}
              <a href="/profile" className="underline">
                profile
              </a>{" "}
              before paying with M-Pesa.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={submitting}
            disabled={addresses.length === 0 || !user?.phone}
          >
            Pay with M-Pesa
          </Button>
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
            You will receive an M-Pesa prompt on your phone
          </p>
        </form>

        {/* Order summary */}
        <div className="w-full lg:w-64">
          <div className="rounded-md border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
              Summary
            </p>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span className="truncate text-zinc-600 dark:text-zinc-400 max-w-[150px]">
                    {item.variant?.product?.name ??
                      item.product?.name ??
                      "Item"}{" "}
                    ×{item.quantity}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300 shrink-0">
                    {(
                      (item.price ?? Number(item.variant?.price ?? 0)) *
                      item.quantity
                    ).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-zinc-800 dark:text-zinc-200">
                  Subtotal
                </span>
                <span className="text-zinc-900 dark:text-zinc-50">
                  KES {subtotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
