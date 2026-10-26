"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { AuthHeading, authLinkClass } from "./AuthHeading";
import {
  otpRequestSchema,
  otpVerifySchema,
  type OtpRequestFormValues,
  type OtpVerifyFormValues,
} from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { normalizeKenyanPhone } from "@/lib/phone";
import { useAuthStore } from "@/store/auth.store";
import { postLoginPath } from "@/lib/session";
import { apiErrorMessage } from "@/lib/utils";

export function OtpForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [phone, setPhone] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const requestForm = useForm<OtpRequestFormValues>({
    resolver: zodResolver(otpRequestSchema),
  });

  const verifyForm = useForm<OtpVerifyFormValues>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { phone: "", code: "" },
  });
  // The number has no account — phone sign-in can't create one.
  const [noAccount, setNoAccount] = useState(false);

  const onRequestSubmit = async (values: OtpRequestFormValues) => {
    setServerError(null);
    setNoAccount(false);
    try {
      const phone = normalizeKenyanPhone(values.phone) as string;
      await api.post("/auth/otp/request", { phone });
      setPhone(phone);
      verifyForm.setValue("phone", phone);
      setStep("verify");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 404) {
        setNoAccount(true);
        return;
      }
      setServerError(
        apiErrorMessage(
          err,
          "Failed to send code. Check the number and try again.",
        ),
      );
    }
  };

  const onVerifySubmit = async (values: OtpVerifyFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post("/auth/otp/verify", values);
      setAuth(data.data.accessToken, data.data.user);
      // Drop pages cached as a guest before navigating in the new layout.
      router.refresh();
      router.replace(postLoginPath(data.data.user.role));
    } catch (err: unknown) {
      setServerError(apiErrorMessage(err, "Invalid or expired code."));
    }
  };

  if (step === "verify") {
    return (
      <div className="w-full max-w-sm animate-fade-in">
        <AuthHeading
          title="Check your phone"
          subtitle={
            <>
              We sent a 6-digit code to{" "}
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {phone}
              </span>
            </>
          }
        />

        <form
          onSubmit={verifyForm.handleSubmit(onVerifySubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            inputSize="lg"
            id="code"
            type="text"
            inputMode="numeric"
            label="Verification code"
            placeholder="000000"
            className="text-center font-mono text-xl tracking-[0.5em]"
            maxLength={6}
            autoComplete="one-time-code"
            error={verifyForm.formState.errors.code?.message}
            {...verifyForm.register("code")}
          />

          <FormError message={serverError} />

          <Button
            type="submit"
            size="lg"
            isLoading={verifyForm.formState.isSubmitting}
            className="w-full"
          >
            Verify
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setStep("request");
            setServerError(null);
            verifyForm.reset();
          }}
          className="tap-target mt-5 w-full rounded text-center text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <AuthHeading
        title="Sign in with phone"
        subtitle="We’ll text you a one-time code. No password needed."
      />

      <form
        onSubmit={requestForm.handleSubmit(onRequestSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          inputSize="lg"
          id="phone"
          type="tel"
          label="Phone number"
          placeholder="0712 345 678"
          inputMode="tel"
          autoComplete="tel"
          error={requestForm.formState.errors.phone?.message}
          {...requestForm.register("phone", {
            onChange: () => setNoAccount(false),
          })}
        />

        {noAccount && (
          <div
            role="alert"
            className="animate-fade-in rounded-lg border border-amber-300/60 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          >
            No account uses this number.{" "}
            <Link href="/register" className={authLinkClass}>
              Create an account
            </Link>{" "}
            first, then you can sign in with your phone.
          </div>
        )}

        <FormError message={serverError} />

        <Button
          type="submit"
          size="lg"
          isLoading={requestForm.formState.isSubmitting}
          className="w-full"
        >
          Send code
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Sign in with{" "}
        <Link href="/login" className={authLinkClass}>
          email instead
        </Link>
      </p>
    </div>
  );
}
