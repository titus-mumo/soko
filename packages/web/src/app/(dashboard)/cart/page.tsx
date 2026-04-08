"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCart,
  updateCartItemQuantity,
  removeCartItem,
} from "@/lib/cart.api";
import { useCartStore } from "@/store/cart.store";
import { toast } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const { items, subtotal, setCart } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getCart()
      .then(setCart)
      .finally(() => setLoading(false));
  }, [setCart]);

  const handleQuantityChange = async (item: CartItem, delta: number) => {
    const next = item.quantity + delta;
    setUpdatingId(item.id);
    try {
      if (next <= 0) {
        const updated = await removeCartItem(item.id);
        setCart(updated);
      } else {
        const updated = await updateCartItemQuantity(item.id, next);
        setCart(updated);
      }
    } catch {
      toast.error("Failed to update cart");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (item: CartItem) => {
    setUpdatingId(item.id);
    try {
      const updated = await removeCartItem(item.id);
      setCart(updated);
      toast.info("Item removed");
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper to get a readable name from cart item
  const getItemName = (item: CartItem) =>
    item.variant?.product?.name ??
    item.product?.name ??
    `Item ${item.id.slice(-4)}`;

  const getItemVariantLabel = (item: CartItem) =>
    [item.variant?.size, item.variant?.color, item.variant?.material]
      .filter(Boolean)
      .join(" / ") || item.variant?.sku;

  const getItemPrice = (item: CartItem) =>
    item.price ?? Number(item.variant?.price ?? 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-md" />
        ))}
        <Skeleton className="h-28 rounded-md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Cart
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-zinc-400 dark:text-zinc-600">
            Your cart is empty
          </p>
          <Link href="/categories" className="mt-4">
            <Button variant="secondary" size="sm">
              Browse products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="divide-y divide-zinc-100 rounded-md border border-zinc-100 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {getItemName(item)}
                  </p>
                  {getItemVariantLabel(item) && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-600">
                      {getItemVariantLabel(item)}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    KES {(getItemPrice(item) * item.quantity).toLocaleString()}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center rounded border border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => handleQuantityChange(item, -1)}
                    disabled={updatingId === item.id}
                    className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-700 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm text-zinc-800 dark:text-zinc-200">
                    {updatingId === item.id ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-zinc-600" />
                    ) : (
                      item.quantity
                    )}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item, 1)}
                    disabled={updatingId === item.id}
                    className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-700 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleRemove(item)}
                  disabled={updatingId === item.id}
                  className="text-zinc-400 transition-colors hover:text-red-500 disabled:opacity-40 dark:text-zinc-600 dark:hover:text-red-400"
                  aria-label="Remove"
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
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-md border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                KES {subtotal.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
              Delivery fee calculated at checkout
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => router.push("/checkout")}
            >
              Proceed to checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
