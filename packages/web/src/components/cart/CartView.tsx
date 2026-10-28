"use client";

import { useCallback, useEffect, useState } from "react";
import { LOW_STOCK, availableOf } from "@/lib/stock";
import { CartSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCartWithDetails,
  adjustCartItemQuantity,
  removeCartItem,
  clearCart,
} from "@/lib/cart.api";
import {
  loadPendingPromo,
  previewPromoCode,
  savePendingPromo,
  type PromoPreview,
} from "@/lib/promotions.api";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { getVariantDetailsMap } from "@/lib/products.api";
import {
  clearGuestCart,
  getGuestLines,
  setGuestQuantity,
} from "@/lib/guest-cart";
import { toast } from "@/store/toast.store";
import { useRefetchOnFocus } from "@/hooks/useRefetchOnFocus";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SafeImage } from "@/components/ui/SafeImage";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { cardClasses } from "@/components/ui/Card";
import { apiErrorMessage, cn, formatKES } from "@/lib/utils";
import type { CartLine } from "@/lib/types";

/**
 * How many of a line the shopper can have: the server's per-shopper figure
 * for an account cart, the public availability for a guest cart.
 */
const lineLimit = (line: CartLine): number | undefined =>
  line.availableQuantity ??
  (line.details ? availableOf(line.details.variant) : undefined);

const variantLabel = (line: CartLine) => {
  const v = line.details?.variant;
  if (!v) return null;
  return (
    [v.size, v.color, v.material].filter(Boolean).join(" / ") || "Standard"
  );
};

/** The cart: the account's when signed in, this browser's otherwise. */
export function CartView() {
  const router = useRouter();
  const {
    items,
    itemCount,
    subtotal,
    setCart,
    updateQuantity,
    removeItem,
    clearCart: clearStore,
  } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  // Signed out: the cart lives in this browser until sign-in, when it moves
  // to the account. Only checkout needs an account.
  const [guest, setGuest] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (!useAuthStore.getState().user) {
        setGuest(true);
        const saved = getGuestLines();
        const details = saved.length
          ? await getVariantDetailsMap(saved.map((l) => l.variantId))
          : {};
        setCart(
          saved
            .filter((l) => details[l.variantId])
            .map(
              (l) =>
                ({
                  id: l.variantId,
                  cartId: "guest",
                  productVariantId: l.variantId,
                  quantity: l.quantity,
                  details: details[l.variantId],
                }) as CartLine,
            ),
        );
        return;
      }
      setGuest(false);
      const { lines, subtotal } = await getCartWithDetails();
      setCart(lines, subtotal);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load your cart"));
    } finally {
      setLoading(false);
    }
  }, [setCart]);

  useEffect(() => {
    load();
  }, [load]);
  useRefetchOnFocus(load);

  // Optimistic: the store changes first, the server catches up, then we
  // re-read for live prices. On failure, the re-read puts things back.
  const handleAdjust = async (line: CartLine, delta: number) => {
    const next = line.quantity + delta;
    updateQuantity(line.id, next);
    if (guest) {
      setGuestQuantity(line.productVariantId, next);
      return;
    }
    try {
      if (next <= 0) await removeCartItem(line.id);
      else await adjustCartItemQuantity(line.id, delta);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update cart"));
    } finally {
      await load();
    }
  };

  const handleRemove = async (line: CartLine) => {
    removeItem(line.id);
    if (guest) {
      setGuestQuantity(line.productVariantId, 0);
      toast.info(`Removed ${line.details?.product.name ?? "item"}`);
      return;
    }
    try {
      await removeCartItem(line.id);
      toast.info(`Removed ${line.details?.product.name ?? "item"}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to remove item"));
    } finally {
      await load();
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      if (guest) clearGuestCart();
      else await clearCart();
      clearStore();
      savePendingPromo(null);
      toast.info("Cart cleared");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to clear cart"));
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  if (loading) {
    return <CartSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg">
        <ErrorState
          title="Couldn't load your cart"
          message={error}
          onRetry={load}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Cart" />
        <EmptyState
          icon="bag"
          title="Your cart is empty"
          description="Browse products and add items to your cart"
          action={
            <ButtonLink href="/products">
              Start shopping
              <Icon name="arrow-right" />
            </ButtonLink>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cart"
        description={`${itemCount} item${itemCount !== 1 ? "s" : ""}`}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClear(true)}
          >
            <Icon name="trash" size={14} />
            Clear cart
          </Button>
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ul
          className={cardClasses({
            padded: false,
            className:
              "divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800",
          })}
        >
          {items.map((line) => {
            const product = line.details?.product;
            const price = Number(line.details?.variant.price ?? 0);
            const stock = lineLimit(line);
            const over = stock !== undefined && line.quantity > stock;
            const name = product?.name ?? "Item";
            return (
              <li key={line.id}>
                <SwipeToDelete
                  label={`Remove ${name}`}
                  onDelete={() => handleRemove(line)}
                >
                  <div className="flex gap-4 p-4 sm:p-5">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-inset ring-zinc-900/5 dark:ring-white/10 sm:h-24 sm:w-24">
                      {line.details?.primaryImage ? (
                        <SafeImage
                          src={line.details.primaryImage.url}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-contain p-[6%]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                          <Icon name="image" size={20} />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {product ? (
                            <Link
                              href={`/products/${product.slug}`}
                              className="line-clamp-2 rounded text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                            >
                              {product.name}
                            </Link>
                          ) : (
                            <p className="text-sm text-zinc-500">
                              Item no longer available
                            </p>
                          )}
                          {variantLabel(line) && (
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                              {variantLabel(line)}
                            </p>
                          )}
                          {over && (
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                              <Icon name="alert" size={12} />
                              {stock === 0
                                ? "Out of stock. Remove it to check out."
                                : `Only ${stock} left. Lower the quantity to check out.`}
                            </p>
                          )}
                          {!over &&
                            stock !== undefined &&
                            stock > 0 &&
                            stock <= LOW_STOCK && (
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {stock === line.quantity
                                  ? "That's all we have"
                                  : `Only ${stock} left`}
                              </p>
                            )}
                        </div>
                        <Price
                          amount={price * line.quantity}
                          size="sm"
                          className="shrink-0"
                        />
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                        <div
                          className="flex h-9 items-center rounded-lg border border-zinc-300 dark:border-zinc-700"
                          role="group"
                          aria-label={`Quantity of ${name}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleAdjust(line, -1)}
                            aria-label={
                              line.quantity === 1
                                ? `Remove ${name}`
                                : "Decrease quantity"
                            }
                            className="tap-target flex h-full w-9 items-center justify-center rounded-l-lg text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            <Icon
                              name={line.quantity === 1 ? "trash" : "minus"}
                              size={14}
                            />
                          </button>
                          <span
                            className="tabular w-8 text-center font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100"
                            aria-live="polite"
                          >
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjust(line, 1)}
                            disabled={
                              stock !== undefined && line.quantity >= stock
                            }
                            aria-label="Increase quantity"
                            className="tap-target flex h-full w-9 items-center justify-center rounded-r-lg text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            <Icon name="plus" size={14} />
                          </button>
                        </div>
                        <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:inline">
                          <span className="tabular font-mono">
                            {formatKES(price)}
                          </span>{" "}
                          each
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemove(line)}
                          className="tap-target rounded text-sm text-zinc-500 transition-colors hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </SwipeToDelete>
              </li>
            );
          })}
        </ul>

        <OrderSummary
          subtotal={subtotal}
          itemCount={itemCount}
          guest={guest}
          // Lines asking for more than is left must be fixed first.
          blocked={items.some((l) => {
            const limit = lineLimit(l);
            return limit !== undefined && l.quantity > limit;
          })}
          // Checkout is where an account is needed; signing in moves this
          // browser's cart into it.
          onCheckout={() =>
            router.push(guest ? "/login?next=/checkout" : "/checkout")
          }
        />
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear cart"
        message="Remove all items from your cart?"
        confirmLabel="Clear cart"
        destructive
        loading={clearing}
        onConfirm={handleClear}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}

function OrderSummary({
  subtotal,
  itemCount,
  guest,
  blocked,
  onCheckout,
}: {
  subtotal: number;
  itemCount: number;
  guest: boolean;
  blocked: boolean;
  onCheckout: () => void;
}) {
  const [promoOpen, setPromoOpen] = useState(false);
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<(PromoPreview & { code: string }) | null>(
    null,
  );
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const apply = useCallback(
    async (raw: string, quiet = false) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      setChecking(true);
      setPromoError(null);
      try {
        const preview = await previewPromoCode(trimmed, subtotal);
        setPromo({ ...preview, code: trimmed });
        savePendingPromo(trimmed);
      } catch (err) {
        setPromo(null);
        savePendingPromo(null);
        if (!quiet)
          setPromoError(apiErrorMessage(err, "That code isn't valid"));
      } finally {
        setChecking(false);
      }
    },
    [subtotal],
  );

  // Re-check a code applied earlier in this tab against the current subtotal.
  useEffect(() => {
    const saved = loadPendingPromo();
    if (saved) {
      setCode(saved);
      setPromoOpen(true);
      apply(saved, true);
    }
  }, [apply]);

  const remove = () => {
    setPromo(null);
    setCode("");
    savePendingPromo(null);
  };

  return (
    <aside
      aria-labelledby="summary-heading"
      className={cardClasses({ className: "lg:sticky lg:top-20" })}
    >
      <h2
        id="summary-heading"
        className="text-lg font-semibold text-zinc-950 dark:text-white"
      >
        Order summary
      </h2>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-600 dark:text-zinc-400">
            Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
          </dt>
          <dd>
            <Price amount={subtotal} size="sm" />
          </dd>
        </div>
        {promo && (
          <div className="flex justify-between text-brand-700 dark:text-brand-400">
            <dt className="flex items-center gap-1.5">
              <Icon name="tag" size={14} />
              <span className="font-mono">{promo.code}</span>
            </dt>
            <dd className="tabular font-mono font-semibold">
              −
              <span className="tabular font-mono">
                {formatKES(promo.discount)}
              </span>
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-zinc-600 dark:text-zinc-400">Delivery</dt>
          <dd className="text-zinc-500 dark:text-zinc-400">At checkout</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setPromoOpen((o) => !o)}
          aria-expanded={promoOpen}
          aria-controls="promo-panel"
          className="flex w-full items-center justify-between rounded text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
        >
          Have a promo code?
          <Icon
            name="chevron-down"
            className={cn(
              "transition-transform duration-200",
              promoOpen && "rotate-180",
            )}
          />
        </button>
        <div
          id="promo-panel"
          hidden={!promoOpen}
          className="animate-fade-in pt-3"
        >
          {promo ? (
            <div className="flex items-center justify-between rounded-lg bg-brand-600/10 px-3 py-2 text-sm">
              <span className="text-brand-800 dark:text-brand-300">
                <span className="font-mono font-semibold">{promo.code}</span>{" "}
                applied
              </span>
              <button
                type="button"
                onClick={remove}
                className="rounded text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              >
                Remove
              </button>
            </div>
          ) : (
            <form
              className="flex items-start gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                apply(code);
              }}
            >
              <div className="flex-1">
                <Input
                  id="cart-promo"
                  label="Promo code"
                  hideLabel
                  placeholder="Enter code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  error={promoError ?? undefined}
                  className="font-mono uppercase"
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                isLoading={checking}
                disabled={!code.trim()}
              >
                Apply
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Estimated total
        </span>
        <Price amount={promo ? promo.finalAmount : subtotal} size="lg" />
      </div>

      {blocked && (
        <p
          className="mt-4 flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-400"
          role="alert"
        >
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          Some items have less stock than you asked for. Update them above.
        </p>
      )}
      <Button
        size="lg"
        className="mt-5 w-full"
        onClick={onCheckout}
        disabled={blocked}
      >
        {guest ? "Sign in to check out" : "Checkout"}
        <Icon name="arrow-right" />
      </Button>
      {guest && (
        <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Your cart is saved to your account when you sign in.
        </p>
      )}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <Icon name="shield" size={12} />
        Secure payment with M-Pesa
      </p>
    </aside>
  );
}
