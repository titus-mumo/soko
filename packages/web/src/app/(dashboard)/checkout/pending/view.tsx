"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getPaymentByOrderId, initiatePayment } from "@/lib/payments.api";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { apiErrorMessage, cn, orderRef } from "@/lib/utils";

const POLL_MS = 4000;
// M-Pesa STK prompts expire after about two minutes.
const TIMEOUT_MS = 120_000;

type PaymentState = "waiting" | "paid" | "failed" | "timeout" | "not_sent";

export default function CheckoutPendingPage() {
  return (
    <Suspense>
      <PendingPayment />
    </Suspense>
  );
}

function PendingPayment() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const amount = searchParams.get("amount");
  const phone = searchParams.get("phone") ?? "";
  const initialError = searchParams.get("error");

  const [state, setState] = useState<PaymentState>(
    initialError ? "not_sent" : "waiting",
  );
  const [message, setMessage] = useState<string | null>(initialError);
  const [resending, setResending] = useState(false);
  // Bumped on each resend to restart the polling window.
  const [attempt, setAttempt] = useState(0);
  const stopped = useRef(false);
  const [deadline, setDeadline] = useState(() => Date.now() + TIMEOUT_MS);
  const [now, setNow] = useState(() => Date.now());

  const checkStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const payment = await getPaymentByOrderId(orderId);
      if (stopped.current) return;
      if (payment.status === "paid") {
        stopped.current = true;
        setState("paid");
      } else if (payment.status === "failed") {
        stopped.current = true;
        setState("failed");
      }
    } catch {
      // The payment record may not exist yet — keep polling.
    }
  }, [orderId]);

  useEffect(() => {
    if (state !== "waiting") return;
    stopped.current = false;
    setDeadline(Date.now() + TIMEOUT_MS);
    setNow(Date.now());
    checkStatus();
    const interval = setInterval(checkStatus, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const timeout = setTimeout(() => {
      if (!stopped.current) {
        stopped.current = true;
        setState("timeout");
      }
    }, TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearInterval(tick);
      clearTimeout(timeout);
    };
  }, [state, attempt, checkStatus]);

  const handleResend = async () => {
    setResending(true);
    setMessage(null);
    try {
      await initiatePayment(orderId, phone);
      setAttempt((a) => a + 1);
      setState("waiting");
    } catch (err) {
      setMessage(apiErrorMessage(err, "Couldn't send the M-Pesa prompt"));
      setState("not_sent");
    } finally {
      setResending(false);
    }
  };

  if (!orderId) {
    return (
      <Centered>
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
          No order to track
        </h1>
        <ButtonLink href="/orders" className="mt-6">
          Go to orders
        </ButtonLink>
      </Centered>
    );
  }

  const maskedPhone = phone ? `${phone.slice(0, -6)}•••${phone.slice(-3)}` : "";
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <Centered>
      <StateIcon state={state} />

      {state === "waiting" && (
        <>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-white">
            Check your phone
          </h1>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            We sent an M-Pesa request
            {maskedPhone && (
              <>
                {" "}
                to{" "}
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {maskedPhone}
                </span>
              </>
            )}
            . Enter your PIN to pay.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <Countdown
              remaining={remaining}
              total={TIMEOUT_MS / 1000}
              label={clock}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Waiting for confirmation
            </p>
          </div>
        </>
      )}

      {state === "paid" && (
        <>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-white">
            Payment received
          </h1>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            Thank you. Your order is confirmed and we&apos;ll let you know when
            it ships.
          </p>
        </>
      )}

      {(state === "failed" || state === "timeout" || state === "not_sent") && (
        <>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-white">
            {state === "failed"
              ? "Payment didn’t go through"
              : state === "timeout"
                ? "The prompt has expired"
                : "We couldn’t send the prompt"}
          </h1>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            {state === "failed"
              ? "It was cancelled or declined."
              : state === "timeout"
                ? "We haven’t received confirmation. If you already paid, it may take a moment to show on your order."
                : (message ?? "We couldn’t reach M-Pesa.")}{" "}
            Your order is saved, so you can try again.
          </p>
          {message && state !== "not_sent" && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {message}
            </p>
          )}
        </>
      )}

      <dl className="mt-8 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white text-left text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-zinc-500 dark:text-zinc-400">Order</dt>
          <dd className="font-mono text-zinc-500 dark:text-zinc-400">
            {orderRef(orderId)}
          </dd>
        </div>
        {amount && (
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-zinc-500 dark:text-zinc-400">Amount</dt>
            <dd>
              <Price amount={amount} accent />
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {state === "paid" ? (
          <>
            <ButtonLink href={`/orders/${orderId}`} size="lg">
              View order
            </ButtonLink>
            <ButtonLink href="/products" variant="ghost" size="lg">
              Keep shopping
            </ButtonLink>
          </>
        ) : (
          <>
            {phone && (
              <Button
                size="lg"
                variant={state === "waiting" ? "secondary" : "primary"}
                isLoading={resending}
                onClick={handleResend}
              >
                <Icon name="refresh" />
                Resend prompt
              </Button>
            )}
            <ButtonLink href={`/orders/${orderId}`} variant="ghost" size="lg">
              {state === "waiting" ? "Check later" : "View order"}
            </ButtonLink>
          </>
        )}
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center">
      <div className="w-full max-w-md animate-fade-in text-center">
        {children}
      </div>
    </div>
  );
}

/** Ring that drains as the prompt's two minutes run out. */
function Countdown({
  remaining,
  total,
  label,
}: {
  remaining: number;
  total: number;
  label: string;
}) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative h-14 w-14"
      role="timer"
      aria-label={`${label} left to enter your PIN`}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="3"
          className="stroke-zinc-200 dark:stroke-zinc-800"
        />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - remaining / total)}
          className="stroke-brand-600 transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="tabular absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
        {label}
      </span>
    </div>
  );
}

function StateIcon({ state }: { state: PaymentState }) {
  if (state === "waiting") {
    return (
      <div className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-brand-500/20 [animation-duration:2s]"
        />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <span className="animate-ring">
            <Icon name="phone" size={32} />
          </span>
        </span>
      </div>
    );
  }
  const tone =
    state === "paid"
      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30"
      : state === "timeout"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-red-500/15 text-red-600 dark:text-red-400";
  return (
    <div
      className={cn(
        "mx-auto mb-8 flex h-20 w-20 animate-pop items-center justify-center rounded-full",
        tone,
      )}
    >
      <Icon
        name={state === "paid" ? "check" : state === "timeout" ? "clock" : "x"}
        size={32}
        strokeWidth={state === "paid" ? 2.5 : 1.75}
      />
    </div>
  );
}
