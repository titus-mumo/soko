"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderDetailSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getBuyerOrderById, cancelOrder } from "@/lib/orders.api";
import { getVariantDetailsMap } from "@/lib/products.api";
import { getUserAddresses } from "@/lib/profile.api";
import { getPaymentByOrderId, initiatePayment } from "@/lib/payments.api";
import { getOrderShipment } from "@/lib/delivery.api";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  ShipmentStatusBadge,
  statusLabel,
} from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SafeImage } from "@/components/ui/SafeImage";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/toast.store";
import { useAuthStore } from "@/store/auth.store";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { PageHeader } from "@/components/ui/PageHeader";
import { cardClasses } from "@/components/ui/Card";
import {
  apiErrorMessage,
  cn,
  formatKES,
  orderRef,
  relativeTime,
} from "@/lib/utils";
import { normalizeKenyanPhone } from "@/lib/phone";
import type {
  Address,
  OrderDetail,
  OrderStatus,
  Payment,
  ShipmentTimeline,
  VariantDetails,
} from "@/lib/types";

const fmtDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime && { hour: "2-digit", minute: "2-digit" }),
  });

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [variants, setVariants] = useState<Record<string, VariantDetails>>({});
  const [address, setAddress] = useState<Address | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  // One shipment per order, sent from the hub; null until it ships.
  const [shipment, setShipment] = useState<ShipmentTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payPhone, setPayPhone] = useState(user?.phone ?? "");
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getBuyerOrderById(id);
      setDetail(d);
      const [vmap, addrs, pay, ship] = await Promise.all([
        getVariantDetailsMap(d.items.map((i) => i.productVariantId)),
        getUserAddresses().catch(() => []),
        getPaymentByOrderId(id).catch(() => null),
        getOrderShipment(id).catch(() => null),
      ]);
      setVariants(vmap);
      setAddress(addrs.find((a) => a.id === d.order.deliveryAddressId) ?? null);
      setPayment(pay);
      setShipment(ship);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelOrder(id);
      toast.success("Order cancelled");
      setShowCancel(false);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to cancel order"));
    } finally {
      setCancelling(false);
    }
  };

  const handlePay = async () => {
    const phone = normalizeKenyanPhone(payPhone);
    if (!phone) {
      setPayError("Enter a valid M-Pesa number, e.g. 0712 345 678");
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      await initiatePayment(id, phone);
      const params = new URLSearchParams({
        orderId: id,
        amount: detail?.order.totalAmount ?? "",
        phone,
      });
      router.push(`/checkout/pending?${params}`);
    } catch (err) {
      setPayError(apiErrorMessage(err, "Couldn't send the M-Pesa prompt"));
      setPaying(false);
    }
  };

  if (loading) {
    return <OrderDetailSkeleton />;
  }

  if (notFound || !detail) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState
          icon="bag"
          title="Order not found"
          description="It may belong to another account, or the link is wrong."
          action={
            <ButtonLink href="/orders" variant="secondary" size="sm">
              Back to orders
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const { order, items } = detail;
  const itemsSubtotal = items.reduce((s, i) => s + Number(i.subtotal), 0);
  const canCancel = order.status === "pending" || order.status === "confirmed";
  const canPay =
    order.paymentStatus !== "paid" &&
    order.paymentStatus !== "refunded" &&
    order.status !== "cancelled";

  return (
    <div className="space-y-8">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 rounded text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <Icon name="chevron-left" size={14} />
        All orders
      </Link>

      <PageHeader
        eyebrow={
          <time dateTime={order.createdAt}>
            Placed {fmtDate(order.createdAt, true)} ·{" "}
            {relativeTime(order.createdAt)}
          </time>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{orderRef(order.id)}</span>
            <OrderStatusBadge status={order.status} />
          </span>
        }
        actions={
          canCancel && (
            <Button
              variant="ghost"
              onClick={() => setShowCancel(true)}
              className="text-red-600 dark:text-red-400"
            >
              Cancel order
            </Button>
          )
        }
      />

      <OrderProgress status={order.status} />

      {canPay && (
        <div className="flex flex-col gap-4 rounded-xl border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
            <Icon name="alert" className="shrink-0" />
            {order.paymentStatus === "failed"
              ? "Your last payment attempt didn't go through."
              : "This order hasn't been paid yet."}
          </p>
          <Button onClick={() => setShowPay(true)}>
            <Icon name="phone" />
            Pay{" "}
            <span className="tabular font-mono">
              <span className="tabular font-mono">
                {formatKES(order.totalAmount)}
              </span>
            </span>
          </Button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Items, then the order's single shipment */}
        <section
          aria-labelledby="items-heading"
          className={cardClasses({ padded: false })}
        >
          <h2
            id="items-heading"
            className="border-b border-zinc-100 px-5 py-4 text-base font-semibold text-zinc-950 dark:border-zinc-800 dark:text-white"
          >
            Items{" "}
            <span className="tabular font-mono text-sm font-normal text-zinc-400">
              {items.length}
            </span>
          </h2>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => {
              const v = variants[item.productVariantId];
              const label = v
                ? [v.variant.size, v.variant.color, v.variant.material]
                    .filter(Boolean)
                    .join(" / ") || "Standard"
                : null;
              return (
                <li key={item.id} className="px-5 py-5">
                  <div className="flex gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {v?.primaryImage ? (
                        <SafeImage
                          src={v.primaryImage.url}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                          <Icon name="image" size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        {v ? (
                          <Link
                            href={`/products/${v.product.slug}`}
                            className="line-clamp-2 rounded text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                          >
                            {v.product.name}
                          </Link>
                        ) : (
                          <p className="text-sm text-zinc-500">
                            Product unavailable
                          </p>
                        )}
                        <Price
                          amount={item.subtotal}
                          size="sm"
                          className="shrink-0"
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {label && `${label} · `}
                        <span className="tabular font-mono">
                          {item.quantity}
                        </span>{" "}
                        ×{" "}
                        <span className="tabular font-mono">
                          {formatKES(item.unitPrice)}
                        </span>
                      </p>
                      {(item.status === "cancelled" ||
                        item.status === "refunded") && (
                        <div className="mt-2">
                          <OrderStatusBadge status={item.status} />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-zinc-100 px-5 py-5 dark:border-zinc-800">
            <h3 className="font-sans text-xs font-medium uppercase tracking-widest text-zinc-500">
              Delivery
            </h3>
            <ShipmentBlock timeline={shipment} orderStatus={order.status} />
          </div>
        </section>

        <div className="space-y-6 lg:sticky lg:top-20">
          <section aria-labelledby="summary-heading" className={cardClasses()}>
            <h2
              id="summary-heading"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-100"
            >
              Summary
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600 dark:text-zinc-400">Items</dt>
                <dd className="tabular font-mono">
                  <span className="tabular font-mono">
                    {formatKES(itemsSubtotal)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600 dark:text-zinc-400">Delivery</dt>
                <dd className="tabular font-mono">
                  <span className="tabular font-mono">
                    {formatKES(order.deliveryFee)}
                  </span>
                </dd>
              </div>
              {Number(order.totalAmount) <
                itemsSubtotal + Number(order.deliveryFee) && (
                <div className="flex justify-between text-brand-700 dark:text-brand-400">
                  <dt>Discount</dt>
                  <dd className="tabular font-mono">
                    −
                    {formatKES(
                      itemsSubtotal +
                        Number(order.deliveryFee) -
                        Number(order.totalAmount),
                    )}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <span className="text-sm font-medium">Total</span>
              <Price amount={order.totalAmount} size="lg" />
            </div>
          </section>

          <section aria-labelledby="payment-heading" className={cardClasses()}>
            <div className="flex items-center justify-between">
              <h2
                id="payment-heading"
                className="text-lg font-semibold text-zinc-950 dark:text-zinc-100"
              >
                Payment
              </h2>
              <PaymentStatusBadge
                status={payment?.status ?? order.paymentStatus}
              />
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600 dark:text-zinc-400">Method</dt>
                <dd>M-Pesa</dd>
              </div>
              {payment?.phone && (
                <div className="flex justify-between">
                  <dt className="text-zinc-600 dark:text-zinc-400">Phone</dt>
                  <dd className="font-mono">{payment.phone}</dd>
                </div>
              )}
              {payment?.amount && (
                <div className="flex justify-between">
                  <dt className="text-zinc-600 dark:text-zinc-400">Amount</dt>
                  <dd className="tabular font-mono">
                    <span className="tabular font-mono">
                      {formatKES(payment.amount)}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section aria-labelledby="address-heading" className={cardClasses()}>
            <h2
              id="address-heading"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-100"
            >
              Delivery address
            </h2>
            {address ? (
              <address className="mt-3 text-sm not-italic leading-relaxed text-zinc-700 dark:text-zinc-300">
                <span className="block font-medium capitalize text-zinc-900 dark:text-zinc-100">
                  {address.label}
                </span>
                {address.street && (
                  <span className="block">{address.street}</span>
                )}
                <span className="block">
                  {address.town}, {address.county}
                </span>
              </address>
            ) : (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                This address is no longer in your address book.
              </p>
            )}
            {order.notes && (
              <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                <span className="block text-[12px] font-medium uppercase tracking-wide text-zinc-500">
                  Notes
                </span>
                {order.notes}
              </p>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={showCancel}
        title="Cancel order"
        message="Are you sure you want to cancel this order?"
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        loading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setShowCancel(false)}
      />

      <Modal
        open={showPay}
        onClose={() => setShowPay(false)}
        title="Pay with M-Pesa"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePay();
          }}
          className="space-y-5"
        >
          <Input
            id="pay-phone"
            label="M-Pesa phone number"
            type="tel"
            inputMode="tel"
            inputSize="lg"
            placeholder="0712 345 678"
            prefix={<Icon name="phone" />}
            hint="You'll get a prompt on this phone to enter your PIN"
            value={payPhone}
            onChange={(e) => setPayPhone(e.target.value)}
            error={payError ?? undefined}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPay(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={paying}>
              Send prompt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const PROGRESS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];
const PROGRESS_LABEL: Record<string, string> = {
  pending: "Placed",
  confirmed: "Paid",
  processing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
};

/** Where the order is in its life, as a horizontal timeline. */
function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight dark:text-zinc-400">
        <Icon
          name={status === "cancelled" ? "x" : "refresh"}
          className="text-zinc-400"
        />
        This order was {status}.
      </p>
    );
  }
  const current = PROGRESS.indexOf(status);
  return (
    <ol
      aria-label="Order progress"
      className={cardClasses({
        className: "grid grid-cols-5 gap-2 px-4 py-5 sm:px-6",
      })}
    >
      {PROGRESS.map((s, i) => {
        const done = i <= current;
        return (
          <li
            key={s}
            aria-current={i === current ? "step" : undefined}
            className="relative flex flex-col items-center gap-2 text-center"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2",
                  i <= current
                    ? "bg-brand-600"
                    : "bg-zinc-200 dark:bg-zinc-800",
                )}
              />
            )}
            <span
              className={cn(
                "relative flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-zinc-900",
                done
                  ? "bg-brand-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-800",
              )}
            >
              {done && <Icon name="check" size={12} strokeWidth={3} />}
            </span>
            <span
              className={cn(
                "text-2xs font-medium sm:text-xs",
                i === current
                  ? "text-zinc-950 dark:text-white"
                  : done
                    ? "text-zinc-600 dark:text-zinc-400"
                    : "text-zinc-400 dark:text-zinc-600",
              )}
            >
              {PROGRESS_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The order's shipment from the hub, or where things stand before it. */
function ShipmentBlock({
  timeline,
  orderStatus,
}: {
  timeline: ShipmentTimeline | null | undefined;
  orderStatus: OrderStatus;
}) {
  if (!timeline) {
    const message =
      orderStatus === "pending"
        ? "We'll start preparing your order once it's paid."
        : orderStatus === "cancelled" || orderStatus === "refunded"
          ? "This order won't be delivered."
          : "We're collecting your items at our Nairobi hub. Everything ships to you together, and we'll let you know when it's on its way.";
    return (
      <p className="mt-3 flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Icon
          name="package"
          size={16}
          className="mt-0.5 shrink-0 text-zinc-400"
        />
        {message}
      </p>
    );
  }

  const { shipment, events } = timeline;
  // Newest first: the latest update is what people look for.
  const ordered = [...events].sort(
    (a, b) =>
      new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime(),
  );

  return (
    <div className="mt-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <Icon name="truck" size={14} />
          <span className="capitalize">{shipment.courier}</span>
          {shipment.trackingNumber && (
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              {shipment.trackingNumber}
            </span>
          )}
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </div>

      {ordered.length > 0 ? (
        <ol
          className="mt-4 space-y-4"
          aria-label="Shipment history, newest first"
        >
          {ordered.map((ev, i) => (
            <li
              key={ev.id}
              className="relative flex gap-3"
              aria-current={i === 0 ? "step" : undefined}
            >
              <span className="relative flex w-3 shrink-0 justify-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 mt-1 h-2.5 w-2.5 rounded-full",
                    i === 0
                      ? "bg-brand-600 ring-4 ring-brand-600/20"
                      : "bg-zinc-300 dark:bg-zinc-600",
                  )}
                />
                {i < ordered.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-3 h-[calc(100%+0.5rem)] w-px bg-zinc-200 dark:bg-zinc-700"
                  />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {statusLabel(ev.status)}
                  {ev.location && (
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      {" "}
                      · {ev.location}
                    </span>
                  )}
                </p>
                {ev.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {ev.description}
                  </p>
                )}
                <time
                  dateTime={ev.happenedAt}
                  className="block text-xs text-zinc-500 dark:text-zinc-500"
                >
                  {fmtDate(ev.happenedAt, true)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          No tracking updates yet
        </p>
      )}
    </div>
  );
}
