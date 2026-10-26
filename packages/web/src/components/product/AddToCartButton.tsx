"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToAnyCart } from "@/lib/guest-cart";
import { toast } from "@/store/toast.store";
import { Icon } from "@/components/ui/Icon";
import { apiErrorMessage, cn } from "@/lib/utils";

/**
 * Bottom-of-image action on a product card. Slides up over a gradient on
 * hover/focus where hover exists; always shown on touch screens. Cards are
 * store-anonymous, so a seller's own listing isn't marked here — the server
 * refuses the add and says why (the product page hides the button).
 */
export function AddToCartButton({
  productName,
  productHref,
  variantId,
}: {
  productName: string;
  productHref: string;
  /** Unset when the product has options — opens the product page instead. */
  variantId?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");

  const onClick = async () => {
    if (!variantId) {
      router.push(productHref);
      return;
    }
    setState("adding");
    try {
      // Signed in: the account's cart. Signed out: this browser's cart,
      // which moves to the account on sign-in. Never redirects.
      await addToAnyCart(variantId, 1);
      setState("added");
      toast.success(`Added ${productName} to cart`);
      setTimeout(() => setState("idle"), 1600);
    } catch (err) {
      setState("idle");
      toast.error(apiErrorMessage(err, "Failed to add to cart"));
    }
  };

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-zinc-900/95 to-transparent p-2 pt-8 transition-transform duration-200 ease-out",
        // Hidden below the image until hover/focus — only where hover exists.
        state === "idle" &&
          "[@media(hover:hover)]:translate-y-full [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-hover:translate-y-0",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={state === "adding"}
        aria-label={
          variantId
            ? `Add ${productName} to cart`
            : `Choose options for ${productName}`
        }
        className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:ring-offset-zinc-900 active:scale-[0.98] disabled:opacity-70"
      >
        {state === "adding" ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : (
          <Icon
            name={
              state === "added" ? "check" : variantId ? "cart" : "arrow-right"
            }
            size={16}
          />
        )}
        <span aria-hidden="true">
          {state === "added"
            ? "Added"
            : variantId
              ? "Add to cart"
              : "Choose options"}
        </span>
        <span className="sr-only" aria-live="polite">
          {state === "added" ? "Added to cart" : ""}
        </span>
      </button>
    </div>
  );
}
