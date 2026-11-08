"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addAddress, getUserAddresses } from "@/lib/profile.api";
import { getCartWithDetails } from "@/lib/cart.api";
import {
  getAllDeliveryZones,
  getDeliveryZonesByCounty,
} from "@/lib/delivery.api";
import { placeOrder } from "@/lib/orders.api";
import { initiatePayment } from "@/lib/payments.api";
import {
  loadPendingPromo,
  previewPromoCode,
  savePendingPromo,
  type PromoPreview,
} from "@/lib/promotions.api";
import { syncCartTotals } from "@/lib/sync";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { FormError } from "@/components/ui/FormError";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { SafeImage } from "@/components/ui/SafeImage";
import { cardClasses } from "@/components/ui/Card";
import { AddressForm } from "@/components/profile/AddressForm";
import { apiErrorMessage, cn, formatKES } from "@/lib/utils";
import {
  checkoutSchema,
  type CheckoutValues,
} from "@/lib/validations/checkout";
import { normalizeKenyanPhone } from "@/lib/phone";
import type { AddressValues } from "@/lib/validations/profile";
import type { Address, CartLine, DeliveryZone } from "@/lib/types";

const STEPS = ["Delivery", "Payment", "Review"] as const;
type Step = 0 | 1 | 2;

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState<Step>(0);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [zone, setZone] = useState<DeliveryZone | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [promo, setPromo] = useState<(PromoPreview & { code: string }) | null>(
    null,
  );
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryAddressId: "",
      phone: user?.phone ?? "",
      promoCode: "",
      notes: "",
    },
  });

  const selectedId = watch("deliveryAddressId");
  const selectedAddress = addresses.find((a) => a.id === selectedId);

  useEffect(() => {
    Promise.all([getCartWithDetails(), getUserAddresses()])
      .then(async ([cart, addrs]) => {
        // Guard: nothing to check out.
        if (cart.lines.length === 0) {
          toast.info("Your cart is empty");
          router.replace("/cart");
          return;
        }
        setLines(cart.lines);
        setSubtotal(cart.subtotal);
        setAddresses(addrs);
        setAddingAddress(addrs.length === 0);
        const preferred = addrs.find((a) => a.isDefault) ?? addrs[0];
        if (preferred) setValue("deliveryAddressId", preferred.id);

        // A code applied on the cart page — re-check it at today's subtotal.
        const saved = loadPendingPromo();
        if (saved) {
          setValue("promoCode", saved);
          previewPromoCode(saved, cart.subtotal)
            .then((p) => setPromo({ ...p, code: saved }))
            .catch(() => savePendingPromo(null));
        }
      })
      .catch((err) =>
        setLoadError(apiErrorMessage(err, "Failed to load checkout")),
      )
      .finally(() => setLoading(false));

    getAllDeliveryZones()
      .then((zones) =>
        setCounties([...new Set(zones.map((z) => z.county))].sort()),
      )
      .catch(() => {});
  }, [router, setValue]);

  // Estimate the delivery fee from the selected address's county.
  useEffect(() => {
    if (!selectedAddress) return;
    setZone(undefined);
    getDeliveryZonesByCounty(selectedAddress.county)
      .then((zones) => {
        const cheapest = zones.reduce<DeliveryZone | null>(
          (best, z) =>
            !best || Number(z.baseFee) < Number(best.baseFee) ? z : best,
          null,
        );
        setZone(cheapest);
      })
      .catch(() => setZone(null));
  }, [selectedAddress]);

  const handleAddAddress = async (values: AddressValues) => {
    const created = await addAddress({
      ...values,
      isDefault: values.isDefault || addresses.length === 0,
    });
    setAddresses((list) => [...list, created]);
    setValue("deliveryAddressId", created.id, { shouldValidate: true });
    setAddingAddress(false);
    toast.success("Address saved");
  };

  const handleApplyPromo = async () => {
    const code = getValues("promoCode")?.trim();
    if (!code) return;
    setCheckingPromo(true);
    setPromoError(null);
    try {
      const preview = await previewPromoCode(code, subtotal);
      setPromo({ ...preview, code });
      savePendingPromo(code);
    } catch (err) {
      setPromo(null);
      setPromoError(apiErrorMessage(err, "Invalid promo code"));
    } finally {
      setCheckingPromo(false);
    }
  };

  const next = async () => {
    if (step === 0) {
      if (!(await trigger("deliveryAddressId")) || zone === null) return;
      setStep(1);
    } else if (step === 1) {
      if (!(await trigger(["phone", "notes"]))) return;
      setStep(2);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (values: CheckoutValues) => {
    setServerError(null);
    let orderId: string;
    let total: string;
    try {
      const order = await placeOrder({
        deliveryAddressId: values.deliveryAddressId,
        // Only send a code that passed preview.
        promotionCode: promo?.code,
        notes: values.notes?.trim() || undefined,
      });
      orderId = order.orderId;
      total = order.totalAmount;
    } catch (err) {
      // The code stopped working since it was previewed (used up, expired):
      // drop it so the summary shows the real total and the buyer can
      // place the order without it.
      if (
        axios.isAxiosError(err) &&
        err.response?.data?.code === "PROMO_INVALID"
      ) {
        setPromo(null);
        savePendingPromo(null);
        setPromoError(apiErrorMessage(err, "That promo code can't be used."));
        return;
      }
      setServerError(apiErrorMessage(err, "Failed to place order"));
      return;
    }

    // The order exists now (and the cart is emptied server-side), so the
    // pending page handles any payment failure — including a retry.
    savePendingPromo(null);
    syncCartTotals();
    // Validated by the schema, so this is never null.
    const phone = normalizeKenyanPhone(values.phone) as string;
    const params = new URLSearchParams({ orderId, amount: total, phone });
    try {
      await initiatePayment(orderId, phone);
      toast.success("Order placed — check your phone to pay");
    } catch (err) {
      toast.info("Order placed — but the payment prompt didn't send");
      params.set("error", apiErrorMessage(err, "Payment request failed"));
    }
    router.push(`/checkout/pending?${params}`);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-full max-w-md rounded-full" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <ErrorState
          title="Couldn't load checkout"
          message={loadError}
          onRetry={() => router.refresh()}
        />
        <div className="text-center">
          <ButtonLink href="/cart" variant="ghost" size="sm">
            Back to cart
          </ButtonLink>
        </div>
      </div>
    );
  }

  const deliveryFee = zone ? Number(zone.baseFee) : null;
  const total = subtotal + (deliveryFee ?? 0) - (promo?.discount ?? 0);
  const phoneValue = watch("phone");
  const notesValue = watch("notes");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Checkout
        </h1>
        <Link
          href="/cart"
          className="inline-flex items-center gap-1 rounded text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <Icon name="chevron-left" size={14} />
          Back to cart
        </Link>
      </div>

      <Stepper step={step} onSelect={(s) => s < step && setStep(s)} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {step === 0 && (
            <section
              aria-labelledby="step-delivery"
              className="animate-fade-in space-y-5"
            >
              <StepHeading
                id="step-delivery"
                title="Where should we deliver?"
              />

              {addresses.length > 0 && (
                <div
                  className="grid gap-3 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Delivery address"
                >
                  {addresses.map((addr) => {
                    const active = addr.id === selectedId;
                    return (
                      <label
                        key={addr.id}
                        className={cn(
                          "relative flex cursor-pointer flex-col gap-1 rounded-xl border bg-white p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 dark:bg-zinc-900",
                          active
                            ? "border-brand-600 ring-1 ring-brand-600"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
                        )}
                      >
                        <input
                          type="radio"
                          value={addr.id}
                          className="sr-only"
                          {...register("deliveryAddressId")}
                        />
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
                            <Icon
                              name="pin"
                              size={14}
                              className="text-zinc-400"
                            />
                            {addr.label}
                            {addr.isDefault && (
                              <span className="text-xs font-normal normal-case text-zinc-400">
                                Default
                              </span>
                            )}
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full border",
                              active
                                ? "border-brand-600 bg-brand-600 text-white"
                                : "border-zinc-300 dark:border-zinc-600",
                            )}
                          >
                            {active && (
                              <Icon name="check" size={12} strokeWidth={3} />
                            )}
                          </span>
                        </span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {[addr.street, addr.town, addr.county]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {errors.deliveryAddressId && (
                <p
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {errors.deliveryAddressId.message}
                </p>
              )}
              {zone === null && selectedAddress && (
                <p
                  className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400"
                  role="alert"
                >
                  <Icon name="alert" size={14} />
                  We don&apos;t deliver to {selectedAddress.county} yet. Choose
                  or add another address.
                </p>
              )}

              {addingAddress ? (
                <div className={cardClasses()}>
                  <h3 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-100">
                    New address
                  </h3>
                  <AddressForm
                    counties={counties}
                    onSave={handleAddAddress}
                    onCancel={() => setAddingAddress(false)}
                  />
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setAddingAddress(true)}
                >
                  <Icon name="plus" />
                  Add a new address
                </Button>
              )}

              <StepActions>
                <Button
                  size="lg"
                  onClick={next}
                  disabled={addresses.length === 0 || zone === undefined}
                >
                  Continue to payment
                  <Icon name="arrow-right" />
                </Button>
              </StepActions>
            </section>
          )}

          {step === 1 && (
            <form
              aria-labelledby="step-payment"
              className="animate-fade-in space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
              noValidate
            >
              <StepHeading id="step-payment" title="How you'll pay" />

              <div className="flex items-center gap-4 rounded-xl border border-brand-600 bg-white p-4 ring-1 ring-brand-600 dark:bg-zinc-900">
                <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-display text-xs font-bold tracking-tight text-white">
                  M-PESA
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    M-Pesa
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    You&apos;ll get a prompt on your phone to enter your PIN
                  </p>
                </div>
              </div>

              <Input
                id="checkout-phone"
                label="M-Pesa phone number"
                type="tel"
                inputMode="tel"
                inputSize="lg"
                placeholder="0712 345 678"
                autoComplete="tel"
                prefix={<Icon name="phone" />}
                hint="The number that receives the payment prompt"
                error={errors.phone?.message}
                {...register("phone")}
              />

              <div>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      id="checkout-promo"
                      label="Promo code (optional)"
                      placeholder="SOKO10"
                      autoCapitalize="characters"
                      className="font-mono uppercase"
                      error={promoError ?? undefined}
                      {...register("promoCode", {
                        onChange: () => {
                          setPromo(null);
                          setPromoError(null);
                          savePendingPromo(null);
                        },
                      })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={checkingPromo}
                    onClick={handleApplyPromo}
                    className="mt-[1.6rem]"
                  >
                    Apply
                  </Button>
                </div>
                {promo && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-brand-700 dark:text-brand-400">
                    <Icon name="check" size={14} />
                    <span className="font-mono">{promo.code}</span> applied,
                    saves{" "}
                    <span className="tabular font-mono">
                      {formatKES(promo.discount)}
                    </span>
                  </p>
                )}
              </div>

              <Textarea
                id="checkout-notes"
                label="Delivery notes (optional)"
                placeholder="Gate code, landmarks, best time to call"
                autoGrow
                rows={2}
                error={errors.notes?.message}
                {...register("notes")}
              />

              <StepActions onBack={() => setStep(0)}>
                <Button type="submit" size="lg">
                  Review order
                  <Icon name="arrow-right" />
                </Button>
              </StepActions>
            </form>
          )}

          {step === 2 && (
            <form
              aria-labelledby="step-review"
              className="animate-fade-in space-y-5"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <StepHeading id="step-review" title="Review and pay" />

              <dl
                className={cardClasses({
                  padded: false,
                  className: "divide-y divide-zinc-100 dark:divide-zinc-800",
                })}
              >
                <ReviewRow label="Deliver to" onEdit={() => setStep(0)}>
                  {selectedAddress && (
                    <>
                      <span className="capitalize">
                        {selectedAddress.label}
                      </span>
                      {" · "}
                      {[
                        selectedAddress.street,
                        selectedAddress.town,
                        selectedAddress.county,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      {zone && (
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          Arrives in about {zone.estimatedDays} day
                          {zone.estimatedDays !== 1 ? "s" : ""}
                        </span>
                      )}
                    </>
                  )}
                </ReviewRow>
                <ReviewRow label="Pay with" onEdit={() => setStep(1)}>
                  M-Pesa · <span className="font-mono">{phoneValue}</span>
                </ReviewRow>
                {notesValue?.trim() && (
                  <ReviewRow label="Notes" onEdit={() => setStep(1)}>
                    {notesValue}
                  </ReviewRow>
                )}
              </dl>

              <FormError message={serverError} />

              <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                By paying you agree to our{" "}
                <Link
                  href="/terms"
                  className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Terms of service
                </Link>{" "}
                and{" "}
                <Link
                  href="/returns"
                  className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Returns &amp; refunds policy
                </Link>
                .
              </p>

              <StepActions onBack={() => setStep(1)}>
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={!selectedAddress || zone === null}
                  className="w-full sm:w-auto"
                >
                  <Icon name="phone" />
                  Pay{" "}
                  <span className="tabular font-mono">
                    <span className="tabular font-mono">
                      {formatKES(total)}
                    </span>
                  </span>{" "}
                  with M-Pesa
                </Button>
              </StepActions>
            </form>
          )}
        </div>

        <aside
          aria-labelledby="checkout-summary"
          className={cardClasses({ className: "lg:sticky lg:top-20" })}
        >
          <h2
            id="checkout-summary"
            className="text-lg font-semibold text-zinc-950 dark:text-white"
          >
            Order summary
          </h2>
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-inset ring-zinc-900/5 dark:ring-white/10">
                  {line.details?.primaryImage && (
                    <SafeImage
                      src={line.details.primaryImage.url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain p-[6%]"
                    />
                  )}
                  <span className="tabular absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-zinc-900 px-1 font-mono text-2xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {line.quantity}
                  </span>
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {line.details?.product.name ?? "Item"}
                </span>
                <Price
                  amount={
                    Number(line.details?.variant.price ?? 0) * line.quantity
                  }
                  size="sm"
                />
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2.5 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Subtotal</dt>
              <dd className="tabular font-mono">{formatKES(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Delivery</dt>
              <dd className="tabular font-mono">
                {!selectedAddress
                  ? "—"
                  : zone === undefined
                    ? "…"
                    : deliveryFee === null
                      ? "Unavailable"
                      : formatKES(deliveryFee)}
              </dd>
            </div>
            {promo && (
              <div className="flex justify-between text-brand-700 dark:text-brand-400">
                <dt>Discount ({promo.code})</dt>
                <dd className="tabular font-mono">
                  −
                  <span className="tabular font-mono">
                    {formatKES(promo.discount)}
                  </span>
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Total
            </span>
            <Price amount={total} size="lg" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stepper({
  step,
  onSelect,
}: {
  step: Step;
  onSelect: (s: Step) => void;
}) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li
              key={label}
              className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3"
            >
              <button
                type="button"
                onClick={() => onSelect(i as Step)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                className="flex items-center gap-2 rounded-full disabled:cursor-default"
              >
                <span
                  className={cn(
                    "tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold transition-colors",
                    done && "bg-brand-600 text-white",
                    current &&
                      "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
                    !done &&
                      !current &&
                      "border border-zinc-300 text-zinc-400 dark:border-zinc-700",
                  )}
                >
                  {done ? (
                    <Icon name="check" size={14} strokeWidth={2.5} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    current
                      ? "text-zinc-950 dark:text-white"
                      : "hidden text-zinc-500 sm:inline dark:text-zinc-400",
                  )}
                >
                  {label}
                  {done && <span className="sr-only"> (completed)</span>}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px flex-1",
                    done ? "bg-brand-600" : "bg-zinc-200 dark:bg-zinc-800",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2
      id={id}
      className="text-lg font-semibold text-zinc-950 dark:text-zinc-100"
    >
      {title}
    </h2>
  );
}

function StepActions({
  onBack,
  children,
}: {
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
      {onBack ? (
        <Button variant="ghost" onClick={onBack}>
          <Icon name="chevron-left" />
          Back
        </Button>
      ) : (
        <span />
      )}
      {children}
    </div>
  );
}

function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <dt className="w-24 shrink-0 text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-zinc-900 dark:text-zinc-100">
        {children}
      </dd>
      <button
        type="button"
        onClick={onEdit}
        className="tap-target shrink-0 rounded text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
      >
        Edit<span className="sr-only"> {label.toLowerCase()}</span>
      </button>
    </div>
  );
}
