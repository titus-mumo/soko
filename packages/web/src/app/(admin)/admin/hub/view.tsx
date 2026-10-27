"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelOrderItem,
  getHubOrders,
  receiveItemAtHub,
  type HubOrder,
} from "@/lib/orders.api";
import { createOrderShipment, updateShipmentStatus } from "@/lib/delivery.api";
import { getVariantDetailsMap } from "@/lib/products.api";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { toast } from "@/store/toast.store";
import {
  ItemStatusBadge,
  ShipmentStatusBadge,
} from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { cardClasses } from "@/components/ui/Card";
import { HUB_LABEL } from "@/lib/hub";
import { apiErrorMessage, cn, orderRef, relativeTime } from "@/lib/utils";
import type {
  Courier,
  OrderStatus,
  ShipmentStatus,
  VariantDetails,
} from "@/lib/types";

type Queue = "receive" | "ship" | "transit";

// Soko fulfils every order: paid items are received straight into the hub
// (older orders may still show a store's hand-in steps).
const RECEIVABLE: OrderStatus[] = ["confirmed", "processing", "dropped_off"];
// Anything not yet shipped can be cancelled if Soko can't supply it.
const CANCELLABLE: OrderStatus[] = [...RECEIVABLE, "at_hub"];
const INACTIVE: OrderStatus[] = ["cancelled", "refunded"];

const queueOf = (h: HubOrder): Queue =>
  h.shipment ? "transit" : h.readyToShip ? "ship" : "receive";

const COURIERS: { value: Courier; label: string }[] = [
  { value: "self", label: "Soko rider" },
  { value: "sendy", label: "Sendy" },
  { value: "fargo", label: "Fargo" },
  { value: "other", label: "Other courier" },
];

// The next steps the hub can record for a shipment.
const NEXT_STEPS: Partial<
  Record<
    ShipmentStatus,
    { status: ShipmentStatus; label: string; tone?: "danger" }[]
  >
> = {
  awaiting_pickup: [{ status: "in_transit", label: "Picked up — on its way" }],
  in_transit: [{ status: "out_for_delivery", label: "Out for delivery" }],
  out_for_delivery: [
    { status: "delivered", label: "Delivered" },
    { status: "failed", label: "Delivery failed", tone: "danger" },
  ],
  failed: [
    { status: "out_for_delivery", label: "Retry delivery" },
    { status: "returned", label: "Returned to hub", tone: "danger" },
  ],
};

export default function HubPage() {
  const [orders, setOrders] = useState<HubOrder[]>([]);
  const [variants, setVariants] = useState<Record<string, VariantDetails>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queue>("receive");
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getHubOrders();
      setOrders(list);
      setVariants(
        await getVariantDetailsMap(
          list.flatMap((h) => h.items.map((i) => i.productVariantId)),
        ),
      );
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load hub orders"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefetchOnFocus(load);

  const counts = useMemo(() => {
    const c: Record<Queue, number> = { receive: 0, ship: 0, transit: 0 };
    for (const h of orders) c[queueOf(h)] += 1;
    return c;
  }, [orders]);

  const visible = orders.filter((h) => queueOf(h) === queue);

  const run = async (
    key: string,
    action: () => Promise<void>,
    done: string,
  ) => {
    setBusy(key);
    try {
      await action();
      toast.success(done);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "That didn't work"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={HUB_LABEL}
        title="Hub"
        description="Receive each paid item into the hub, then ship the whole order to the buyer in one go."
      />

      <FilterChips
        label="Hub queue"
        value={queue}
        onChange={setQueue}
        options={[
          { value: "receive", label: "To receive", count: counts.receive },
          { value: "ship", label: "Ready to ship", count: counts.ship },
          { value: "transit", label: "On the way", count: counts.transit },
        ]}
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load the hub"
          message={error}
          onRetry={load}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={
            queue === "receive"
              ? "Nothing to receive"
              : queue === "ship"
                ? "Nothing ready to ship"
                : "Nothing on the way"
          }
          description={
            queue === "receive"
              ? "Paid orders appear here until all their items are at the hub."
              : queue === "ship"
                ? "Orders move here once every item has been received."
                : "Shipped orders stay here until they're delivered."
          }
        />
      ) : (
        <ul className="space-y-4">
          {visible.map((h) => (
            <li key={h.order.id}>
              <HubOrderCard
                hub={h}
                variants={variants}
                busy={busy}
                onReceive={(itemId) =>
                  run(
                    itemId,
                    () => receiveItemAtHub(itemId),
                    "Item received at the hub",
                  )
                }
                onCancel={(id, name) => setCancelling({ id, name })}
                onShip={(courier, tracking) =>
                  run(
                    h.order.id,
                    async () => {
                      await createOrderShipment(h.order.id, courier, tracking);
                    },
                    "Shipment created. Mark it picked up when the courier collects.",
                  )
                }
                onStep={(status) =>
                  run(
                    h.order.id,
                    () => updateShipmentStatus(h.shipment!.id, status),
                    "Shipment updated. The buyer has been notified.",
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel this item?"
        message={
          <>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {cancelling?.name}
            </span>{" "}
            will be removed from the order and its stock put back. The buyer is
            told; refund them separately if they've paid.
          </>
        }
        confirmLabel="Cancel item"
        destructive
        loading={busy === cancelling?.id}
        onConfirm={async () => {
          if (!cancelling) return;
          await run(
            cancelling.id,
            () => cancelOrderItem(cancelling.id),
            "Item cancelled. The buyer has been told.",
          );
          setCancelling(null);
        }}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}

function HubOrderCard({
  hub: h,
  variants,
  busy,
  onReceive,
  onCancel,
  onShip,
  onStep,
}: {
  hub: HubOrder;
  variants: Record<string, VariantDetails>;
  busy: string | null;
  onReceive: (itemId: string) => void;
  onCancel: (itemId: string, name: string) => void;
  onShip: (courier: Courier, tracking?: string) => void;
  onStep: (status: ShipmentStatus) => void;
}) {
  const [courier, setCourier] = useState<Courier>("self");
  const [tracking, setTracking] = useState("");
  const active = h.items.filter((i) => !INACTIVE.includes(i.status));
  const atHub = active.filter((i) => i.status === "at_hub").length;
  const addr = h.deliverTo.address;

  return (
    <article className={cardClasses({ padded: false })}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <div>
          <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {orderRef(h.order.id)}
          </p>
          <p className="text-xs text-zinc-500">
            Ordered {relativeTime(h.order.createdAt)} ·{" "}
            <span className="tabular font-mono">
              {atHub}/{active.length}
            </span>{" "}
            at hub
          </p>
        </div>
        <Price amount={h.order.totalAmount} size="sm" />
      </header>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {h.items.map((item) => {
          const v = variants[item.productVariantId];
          const inactive = INACTIVE.includes(item.status);
          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-wrap items-center gap-3 px-5 py-3",
                inactive && "opacity-50",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {v?.product.name ?? "Item"}{" "}
                  <span className="tabular font-mono text-xs text-zinc-500">
                    ×{item.quantity}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">{item.storeName}</p>
              </div>
              <ItemStatusBadge status={item.status} size="sm" />
              {!h.shipment && RECEIVABLE.includes(item.status) && (
                <Button
                  size="sm"
                  variant={
                    item.status === "dropped_off" ? "primary" : "secondary"
                  }
                  isLoading={busy === item.id}
                  onClick={() => onReceive(item.id)}
                >
                  <Icon name="check" size={14} />
                  Received
                </Button>
              )}
              {!h.shipment && CANCELLABLE.includes(item.status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === item.id}
                  onClick={() =>
                    onCancel(item.id, v?.product.name ?? "This item")
                  }
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  aria-label={`Cancel ${v?.product.name ?? "item"}`}
                >
                  Cancel
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <footer className="grid gap-4 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] dark:border-zinc-800 dark:bg-zinc-950/30">
        <div className="text-sm">
          <p className="font-sans text-xs font-medium uppercase tracking-widest text-zinc-500">
            Deliver to
          </p>
          <p className="mt-1 text-zinc-900 dark:text-zinc-100">
            {h.deliverTo.name ?? "Buyer"}
            {h.deliverTo.phone && (
              <span className="ml-2 font-mono text-zinc-500">
                {h.deliverTo.phone}
              </span>
            )}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            {addr
              ? [addr.street, addr.town, addr.county].filter(Boolean).join(", ")
              : "Address removed by the buyer — contact them before shipping."}
          </p>
          {h.order.notes && (
            <p className="mt-1 text-xs text-zinc-500">Note: {h.order.notes}</p>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {h.shipment ? (
            <>
              <div className="flex items-center gap-2 sm:justify-end">
                <ShipmentStatusBadge status={h.shipment.status} />
                {h.shipment.trackingNumber && (
                  <span className="font-mono text-xs text-zinc-500">
                    {h.shipment.trackingNumber}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {(NEXT_STEPS[h.shipment.status] ?? []).map((step) => (
                  <Button
                    key={step.status}
                    size="sm"
                    variant={step.tone === "danger" ? "ghost" : "primary"}
                    className={
                      step.tone === "danger"
                        ? "text-red-600 dark:text-red-400"
                        : undefined
                    }
                    isLoading={busy === h.order.id}
                    onClick={() => onStep(step.status)}
                  >
                    {step.label}
                  </Button>
                ))}
              </div>
            </>
          ) : h.readyToShip ? (
            <form
              className="flex flex-wrap items-end gap-2 sm:justify-end"
              onSubmit={(e) => {
                e.preventDefault();
                onShip(courier, tracking.trim() || undefined);
              }}
            >
              <div className="w-36">
                <Select
                  id={`courier-${h.order.id}`}
                  label="Courier"
                  hideLabel
                  value={courier}
                  onChange={(e) => setCourier(e.target.value as Courier)}
                >
                  {COURIERS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-40">
                <Input
                  id={`tracking-${h.order.id}`}
                  label="Tracking number (optional)"
                  hideLabel
                  placeholder="Tracking no."
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </div>
              <Button type="submit" isLoading={busy === h.order.id}>
                <Icon name="truck" size={14} />
                Ship order
              </Button>
            </form>
          ) : (
            <p className="text-sm text-zinc-500 sm:text-right">
              Waiting for{" "}
              <span className="tabular font-mono">{active.length - atHub}</span>{" "}
              item{active.length - atHub === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </footer>
    </article>
  );
}
