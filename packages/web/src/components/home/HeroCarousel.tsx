"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSessionUser } from "@/store/auth.store";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 5000;

interface Slide {
  eyebrow: string;
  headline: string;
  subtext: string;
  cta: string;
  href: string;
}

/**
 * Three rotating slides. Advances every 5s; pauses while hovered or focused
 * and stays put for people who prefer reduced motion. Transitions are CSS.
 */
export function HeroCarousel({ counties }: { counties: number }) {
  const user = useSessionUser();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides: Slide[] = [
    {
      eyebrow: "Kenya's marketplace",
      headline: "Shop from Kenya's best sellers",
      subtext:
        "Electronics, fashion and home goods from local stores. Pay with M-Pesa.",
      cta: "Browse products",
      href: "/products",
    },
    {
      eyebrow: "Delivery",
      headline:
        counties > 1
          ? `Fast delivery to ${counties} counties`
          : "Fast delivery across Kenya",
      subtext: "See the fee and delivery time for your county before you pay.",
      cta: "See delivery zones",
      href: "/delivery",
    },
    {
      eyebrow: "Sell on Soko",
      headline: "Start selling today — it's free",
      subtext: "List your products in minutes and get paid through M-Pesa.",
      cta: "Become a seller",
      href: user ? "/profile/seller" : "/register",
    },
  ];

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(
      () => setIndex((i) => (i + 1) % slides.length),
      INTERVAL_MS,
    );
    return () => clearTimeout(t);
  }, [index, paused, slides.length]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative h-[280px] overflow-hidden bg-zinc-900 md:h-[400px]"
    >
      {/* Geometric backdrop: a fine grid fading out, plus green glows. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/25 blur-3xl md:h-[28rem] md:w-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-[8%] top-1/2 hidden h-48 w-48 -translate-y-1/2 rotate-12 rounded-3xl border border-brand-500/30 md:block"
      />
      <div
        aria-hidden="true"
        className="absolute right-[14%] top-1/2 hidden h-32 w-32 -translate-y-1/2 -rotate-6 rounded-2xl border border-white/10 bg-white/[0.02] md:block"
      />

      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={s.headline}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            aria-hidden={!active}
            className={cn(
              "absolute inset-0 flex items-center transition-opacity duration-700 ease-out",
              active ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div
                className={cn(
                  "max-w-xl transition-transform duration-700 ease-out",
                  active ? "translate-y-0" : "translate-y-3",
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-400 md:text-sm">
                  {s.eyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-bold leading-[1.1] text-white md:mt-3 md:text-5xl">
                  {s.headline}
                </h2>
                <p className="mt-3 max-w-md text-sm text-zinc-300 md:mt-4 md:text-lg">
                  {s.subtext}
                </p>
                <Link
                  href={s.href}
                  tabIndex={active ? 0 : -1}
                  className={buttonClasses({
                    size: "lg",
                    className:
                      "mt-5 focus-visible:ring-offset-zinc-900 md:mt-7",
                  })}
                >
                  {s.cta}
                  <Icon name="arrow-right" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 md:bottom-6">
        {slides.map((s, i) => (
          <button
            key={s.headline}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}: ${s.headline}`}
            aria-current={i === index}
            className="tap-target flex h-6 items-center rounded-full px-0.5 focus-visible:ring-offset-zinc-900"
          >
            <span
              aria-hidden="true"
              className={cn(
                "block h-1.5 rounded-full transition-all duration-300",
                i === index
                  ? "w-6 bg-brand-500"
                  : "w-1.5 bg-white/40 hover:bg-white/70",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
