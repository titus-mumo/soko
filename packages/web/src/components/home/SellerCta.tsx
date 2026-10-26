"use client";

import Link from "next/link";
import { useSessionUser } from "@/store/auth.store";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** "Have something to sell?" banner. Signed-in users go straight to store setup. */
export function SellerCta() {
  const user = useSessionUser();
  const href = user
    ? user.role === "seller"
      ? "/dashboard"
      : "/profile/seller"
    : "/register";

  return (
    <section
      aria-labelledby="sell-heading"
      className="relative overflow-hidden rounded-xl border-l-4 border-brand-600 bg-zinc-900 px-6 py-10 sm:px-10 sm:py-12"
    >
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-600/20 blur-3xl"
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2
            id="sell-heading"
            className="text-2xl font-bold text-white sm:text-3xl"
          >
            Have something to sell?
          </h2>
          <p className="mt-2 text-base text-zinc-300">
            Open a store on Soko and reach buyers across Kenya. Listing is free
            and buyers pay you through M-Pesa.
          </p>
        </div>
        <Link
          href={href}
          className={buttonClasses({
            size: "lg",
            className: "shrink-0 focus-visible:ring-offset-zinc-900",
          })}
        >
          {user?.role === "seller"
            ? "Go to your dashboard"
            : "Start selling — it's free"}
          <Icon name="arrow-right" />
        </Link>
      </div>
    </section>
  );
}
