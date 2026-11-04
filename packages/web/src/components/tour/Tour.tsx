"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useSessionUser } from "@/store/auth.store";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

// A first-visit guided tour: a welcome screen, then a spotlight that glides
// between real parts of the page (each tagged data-tour="…"), then a
// celebration. Shown once (localStorage); the footer's "Take the tour" link
// replays it. Steps whose target isn't on screen (e.g. desktop-only
// controls on a phone) are skipped. Honours prefers-reduced-motion.

export const TOUR_KEY = "soko:tour-done";
/** Dispatch on window to replay the tour. */
export const START_TOUR_EVENT = "soko:start-tour";

interface Step {
  target: string;
  title: string;
  body: string;
}

const GUEST_STEPS: Step[] = [
  {
    target: "search",
    title: "Find anything, fast",
    body: "Type a product, brand or category — suggestions appear as you type.",
  },
  {
    target: "product",
    title: "Shop in a tap",
    body: "Open a product for photos, sizes and delivery details — or add it straight to your cart.",
  },
  {
    target: "categories",
    title: "Browse by category",
    body: "Phones, fashion, home and more, neatly organised so you can wander.",
  },
  {
    target: "cart",
    title: "Your cart remembers",
    body: "Add things now, even before you sign in. They'll be waiting for you.",
  },
  {
    target: "signup",
    title: "Pay with M-Pesa",
    body: "Create a free account to check out with M-Pesa and follow your order to your door.",
  },
];

const MEMBER_STEPS: Step[] = [
  {
    target: "sidebar",
    title: "Everything, one click away",
    body: "Shop, orders, cart and alerts all live in this menu.",
  },
  {
    target: "collapse",
    title: "Make some room",
    body: "Fold the menu into a slim rail whenever you like — it remembers.",
  },
  {
    target: "search",
    title: "Find anything, fast",
    body: "Type a product, brand or category — suggestions appear as you type.",
  },
  {
    target: "cart",
    title: "Your cart",
    body: "Everything you add is saved to your account, on every device.",
  },
  {
    target: "notifications",
    title: "Never miss an update",
    body: "Payment, packing and delivery updates arrive here the moment they happen.",
  },
  {
    target: "orders",
    title: "Track every order",
    body: "See where each order is, all the way from our hub to your door.",
  },
];

/** The first on-screen element tagged data-tour="name". */
function findTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(
    `[data-tour="${name}"]`,
  )) {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (r.width > 0 && r.height > 0 && style.visibility !== "hidden") return el;
  }
  return null;
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Phase = "welcome" | "steps" | "done" | null;

export function Tour() {
  const pathname = usePathname();
  const user = useSessionUser();
  const [phase, setPhase] = useState<Phase>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);

  const start = useCallback(() => {
    setIndex(0);
    setPhase("welcome");
  }, []);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      // private mode — it'll just show again next time
    }
    setPhase(null);
  }, []);

  // First visit to the home page (not admins): start after the page settles.
  useEffect(() => {
    if (pathname !== "/" || user?.role === "admin") return;
    let seen = false;
    try {
      seen = localStorage.getItem(TOUR_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    // Wait for the page to finish loading and go idle (scripts, images,
    // hydration) so the entrance animates on a quiet main thread.
    let cancelled = false;
    let idle = 0;
    let timer = 0;
    const whenIdle = () => {
      const go = () => {
        if (!cancelled) timer = window.setTimeout(start, 500);
      };
      if ("requestIdleCallback" in window)
        idle = window.requestIdleCallback(go, { timeout: 3000 });
      else timer = globalThis.setTimeout(go, 1200) as unknown as number;
    };
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", whenIdle);
      if (idle && "cancelIdleCallback" in window)
        window.cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, [pathname, user?.role, start]);

  // Tell the page the tour is open (the hero carousel holds still).
  useEffect(() => {
    if (!phase) return;
    document.documentElement.dataset.tour = "open";
    return () => {
      delete document.documentElement.dataset.tour;
    };
  }, [phase]);

  // Hold every animation at its first frame (opacity .001 — invisible, but
  // enough for the browser to rasterize the layers) until the overlay has
  // painted and the GPU has drawn it, then start them all together. Without
  // this, the first raster lands mid-animation as a ~100ms stutter.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!phase) return setArmed(false);
    // Release once frames are flowing smoothly again (the first raster is
    // done): three quick frames in a row, or 700ms at most on slow devices.
    let frame = 0;
    let last = performance.now();
    const opened = last;
    let smooth = 0;
    const tick = (now: number) => {
      smooth = now - last < 24 ? smooth + 1 : 0;
      last = now;
      if (smooth >= 3 || now - opened > 700) setArmed(true);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase === null]); // eslint-disable-line react-hooks/exhaustive-deps -- arm once per opening

  // Replays: the footer's "Take the tour" link (href="#tour"), or the event.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href="#tour"]')) {
        e.preventDefault();
        start();
      }
    };
    document.addEventListener("click", onClick);
    window.addEventListener(START_TOUR_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(START_TOUR_EVENT, start);
    };
  }, [start]);

  const beginSteps = () => {
    const pool = user ? MEMBER_STEPS : GUEST_STEPS;
    const available = pool.filter((s) => findTarget(s.target));
    setSteps(available);
    setIndex(0);
    setPhase(available.length ? "steps" : "done");
  };

  const next = () =>
    index + 1 < steps.length ? setIndex(index + 1) : setPhase("done");
  const back = () => setIndex(Math.max(0, index - 1));

  // Keyboard: Esc skips, arrows move.
  useEffect(() => {
    if (!phase) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (phase !== "steps") return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!phase) return null;
  return (
    <div
      className={cn("fixed inset-0 z-[100]", !armed && "tour-waiting")}
      aria-live="polite"
    >
      <TourStyles />
      {phase === "welcome" && (
        <Welcome
          signedIn={!!user}
          name={user?.name}
          onStart={beginSteps}
          onSkip={finish}
        />
      )}
      {phase === "steps" && steps[index] && (
        <Spotlight
          step={steps[index]}
          index={index}
          total={steps.length}
          onNext={next}
          onBack={back}
          onSkip={finish}
        />
      )}
      {phase === "done" && <Finale onClose={finish} />}
    </div>
  );
}

// ─── Welcome ─────────────────────────────────────────────────────────────────

function Welcome({
  signedIn,
  name,
  onStart,
  onSkip,
}: {
  signedIn: boolean;
  name?: string;
  onStart: () => void;
  onSkip: () => void;
}) {
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => startRef.current?.focus(), []);
  const first = name?.split(" ")[0];
  return (
    <div className="tour-fade absolute inset-0 flex items-center justify-center bg-zinc-950/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-welcome-title"
        className="tour-pop relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5 dark:bg-zinc-900"
      >
        {/* Drifting glow behind the logo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="tour-blob absolute -left-24 -top-28 h-72 w-72 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(74,222,128,.32), rgba(74,222,128,0))",
            }}
          />
          <div
            className="tour-blob tour-blob-2 absolute -right-24 top-0 h-64 w-64 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(110,231,183,.28), rgba(110,231,183,0))",
            }}
          />
        </div>

        <div className="relative">
          <div className="tour-bounce mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 shadow-lg shadow-brand-900/30">
            <svg
              viewBox="0 0 24 24"
              width="44"
              height="44"
              fill="none"
              stroke="white"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 10h16l-1.6 8.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z" />
              <path d="M8 10 12 4l4 6" />
            </svg>
          </div>

          <h2
            id="tour-welcome-title"
            className="tour-rise mt-6 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white"
            style={{ animationDelay: "140ms" }}
          >
            {signedIn && first ? `Karibu, ${first}!` : "Karibu Soko"}
          </h2>
          <p
            className="tour-rise mt-2 text-zinc-600 dark:text-zinc-300"
            style={{ animationDelay: "240ms" }}
          >
            Kenya&apos;s marketplace. Let us show you around — it takes 30
            seconds.
          </p>

          <ul
            className="mt-6 flex flex-wrap justify-center gap-2"
            aria-label="Why Soko"
          >
            {[
              ["wallet", "Pay with M-Pesa"],
              ["truck", "Delivered across Kenya"],
              ["shield", "Help if anything's wrong"],
            ].map(([icon, label], i) => (
              <li
                key={label}
                className="tour-rise"
                style={{ animationDelay: `${360 + i * 90}ms` }}
              >
                <span
                  className="tour-float inline-flex items-center gap-1.5 rounded-full bg-brand-600/10 px-3 py-1.5 text-xs font-medium text-brand-800 dark:bg-brand-500/15 dark:text-brand-300"
                  // Start floating once the rise has settled, out of step
                  // with each other so they drift rather than bob together.
                  style={{ animationDelay: `${1100 + i * 650}ms` }}
                >
                  <Icon name={icon as "wallet"} size={14} />
                  {label}
                </span>
              </li>
            ))}
          </ul>

          <div
            className="tour-rise mt-8 flex flex-col gap-2"
            style={{ animationDelay: "640ms" }}
          >
            <button
              ref={startRef}
              type="button"
              onClick={onStart}
              className="tour-shine relative h-12 overflow-hidden rounded-xl bg-brand-600 font-semibold text-white shadow-lg shadow-brand-900/20 transition-transform hover:bg-brand-500 active:scale-[0.98]"
            >
              Show me around
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="h-10 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              I&apos;ll explore myself
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Spotlight ───────────────────────────────────────────────────────────────

const PAD = 8;
const GAP = 14;

function Spotlight({
  step,
  index,
  total,
  onNext,
  onBack,
  onSkip,
}: {
  step: Step;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [cardSize, setCardSize] = useState({ w: 320, h: 180 });

  // Bring the target into view, then follow it (scroll/resize).
  useEffect(() => {
    const el = findTarget(step.target);
    if (!el) return onNext();
    el.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: reducedMotion() ? "auto" : "smooth",
    });
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const t = findTarget(step.target);
        if (t) setRect(t.getBoundingClientRect());
      });
    };
    measure();
    const settle = setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step.target]); // eslint-disable-line react-hooks/exhaustive-deps -- re-run per step

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    setCardSize({ w: width, h: height });
  }, [step.target, rect === null]);

  useEffect(() => nextRef.current?.focus(), [index]);

  if (!rect) return <div className="absolute inset-0 bg-zinc-950/60" />;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = {
    top: Math.max(4, rect.top - PAD),
    left: Math.max(4, rect.left - PAD),
    width: Math.min(rect.width + PAD * 2, vw - 8),
    height: Math.min(rect.height + PAD * 2, vh - 8),
  };
  // Caption below the target if it fits, else above, else over it.
  const below = hole.top + hole.height + GAP;
  const above = hole.top - GAP - cardSize.h;
  const top =
    below + cardSize.h < vh - 8
      ? below
      : above > 8
        ? above
        : Math.max(8, vh - cardSize.h - 8);
  const left = Math.min(
    Math.max(8, hole.left + hole.width / 2 - cardSize.w / 2),
    vw - cardSize.w - 8,
  );
  const last = index === total - 1;

  return (
    <>
      {/* The dim with a hole: one huge shadow around the highlighted box,
          which glides from target to target. */}
      <div
        aria-hidden="true"
        className="tour-hole absolute left-0 top-0 rounded-2xl"
        style={{
          width: hole.width,
          height: hole.height,
          transform: `translate3d(${hole.left}px, ${hole.top}px, 0)`,
          boxShadow: "0 0 0 9999px rgba(9, 9, 11, 0.68)",
        }}
      >
        {/* A steady outline, plus a soft pulse around it (separate
            elements: both are drawn with box-shadow). */}
        <span className="absolute inset-0 rounded-2xl border-2 border-brand-400" />
        <span className="tour-ring absolute inset-0 rounded-2xl" />
      </div>

      <div
        className="tour-card-pos absolute left-0 top-0"
        style={{ transform: `translate3d(${left}px, ${top}px, 0)` }}
      >
        <div
          ref={cardRef}
          key={step.target}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
          aria-describedby="tour-step-body"
          className="tour-card w-[min(22rem,calc(100vw-16px))] rounded-2xl bg-white p-5 shadow-xl ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Step {index + 1} of {total}
          </p>
          <h2
            id="tour-step-title"
            className="mt-1 text-lg font-semibold text-zinc-950 dark:text-white"
          >
            {step.title}
          </h2>
          <p
            id="tour-step-body"
            className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
          >
            {step.body}
          </p>

          {/* Progress: the current dot stretches into a bar. */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index
                    ? "w-6 bg-brand-600"
                    : i < index
                      ? "w-1.5 bg-brand-600/50"
                      : "w-1.5 bg-zinc-300 dark:bg-zinc-700",
                )}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {index > 0 && (
                <button
                  type="button"
                  onClick={onBack}
                  className="h-9 rounded-lg px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Back
                </button>
              )}
              <button
                ref={nextRef}
                type="button"
                onClick={onNext}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500"
              >
                {last ? "Finish" : "Next"}
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Finale ──────────────────────────────────────────────────────────────────

function Finale({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="tour-fade absolute inset-0 flex items-center justify-center bg-zinc-950/70 p-4">
      <Confetti />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-done-title"
        className="tour-pop relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5 dark:bg-zinc-900"
      >
        <div className="tour-bounce mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-900/30">
          <Icon name="check" size={32} strokeWidth={2.5} />
        </div>
        <h2
          id="tour-done-title"
          className="mt-5 text-2xl font-bold tracking-tight text-zinc-950 dark:text-white"
        >
          You&apos;re all set!
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Happy shopping — we&apos;ll take it from here.
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="tour-shine relative mt-6 h-12 w-full overflow-hidden rounded-xl bg-brand-600 font-semibold text-white shadow-lg shadow-brand-900/20 hover:bg-brand-500"
        >
          Start shopping
        </button>
      </div>
    </div>
  );
}

/** A short burst of confetti on a canvas — no library, skipped for reduced motion. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const colors = [
      "#16a34a",
      "#22c55e",
      "#facc15",
      "#f97316",
      "#3b82f6",
      "#ec4899",
      "#ffffff",
    ];
    const pieces = Array.from({ length: 160 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? -10 : w + 10,
        y: h * (0.55 + Math.random() * 0.25),
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9),
        vy: -(9 + Math.random() * 9),
        size: 5 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        round: Math.random() < 0.3,
      };
    });
    const startTime = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = now - startTime;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 2200) / 800);
      for (const p of pieces) {
        p.vy += 0.32; // gravity
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      if (t < 3000) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

// ─── Motion ──────────────────────────────────────────────────────────────────

function TourStyles() {
  return (
    <style>{`
      @keyframes tour-fade { from { opacity: .001 } to { opacity: 1 } }
      @keyframes tour-pop { from { opacity: .001; transform: translate3d(0, 22px, 0) } to { opacity: 1; transform: translate3d(0, 0, 0) } }
      @keyframes tour-rise { from { opacity: .001; transform: translate3d(0, 12px, 0) } to { opacity: 1; transform: translate3d(0, 0, 0) } }
      @keyframes tour-bounce { from { opacity: .001; transform: translate3d(0, 14px, 0) } to { opacity: 1; transform: translate3d(0, 0, 0) } }
      @keyframes tour-float { 0%, 100% { transform: translate3d(0, 0, 0) } 50% { transform: translate3d(0, -3px, 0) } }
      @keyframes tour-blob { 0%, 100% { transform: translate3d(0, 0, 0) } 50% { transform: translate3d(22px, 16px, 0) } }
      @keyframes tour-ring { 0% { opacity: .9 } 100% { opacity: 0 } }
      @keyframes tour-shine { 0% { transform: translate3d(-120%, 0, 0) skewX(-20deg) } 55%, 100% { transform: translate3d(260%, 0, 0) skewX(-20deg) } }
      .tour-fade { animation: tour-fade .4s ease-out both }
      .tour-pop { animation: tour-pop .7s cubic-bezier(.16, 1, .3, 1) both; will-change: transform, opacity }
      .tour-rise { animation: tour-rise .7s cubic-bezier(.22, 1, .36, 1) both; will-change: transform, opacity }
      .tour-bounce { animation: tour-bounce .75s cubic-bezier(.34, 1.56, .64, 1) both; will-change: transform, opacity }
      .tour-float { animation: tour-float 3.6s cubic-bezier(.45, 0, .55, 1) infinite; will-change: transform; backface-visibility: hidden }
      .tour-blob { animation: tour-blob 9s cubic-bezier(.45, 0, .55, 1) infinite; will-change: transform }
      .tour-blob-2 { animation-duration: 11s; animation-direction: reverse }
      .tour-hole { will-change: transform, width, height; transition: transform .55s cubic-bezier(.65, 0, .35, 1), width .55s cubic-bezier(.65, 0, .35, 1), height .55s cubic-bezier(.65, 0, .35, 1) }
      .tour-ring { border-radius: inherit; box-shadow: 0 0 0 4px rgba(74, 222, 128, .45); animation: tour-ring 1.8s cubic-bezier(.22, 1, .36, 1) infinite; will-change: transform, opacity }
      .tour-card-pos { will-change: transform; transition: transform .55s cubic-bezier(.65, 0, .35, 1) }
      .tour-card { animation: tour-pop .55s cubic-bezier(.16, 1, .3, 1) both }
      .tour-shine::after { content: ""; position: absolute; inset: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: tour-shine 3.2s cubic-bezier(.45, 0, .55, 1) 1.4s infinite; will-change: transform }
      .tour-waiting, .tour-waiting * { animation-play-state: paused !important }
      @media (prefers-reduced-motion: reduce) {
        .tour-fade, .tour-pop, .tour-rise, .tour-bounce, .tour-float, .tour-blob, .tour-ring, .tour-card, .tour-shine::after { animation: none !important }
        .tour-hole, .tour-card-pos { transition: none !important }
      }
    `}</style>
  );
}
