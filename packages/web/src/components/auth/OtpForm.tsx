"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  otpRequestSchema,
  otpVerifySchema,
  type OtpRequestFormValues,
  type OtpVerifyFormValues,
} from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

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

  const onRequestSubmit = async (values: OtpRequestFormValues) => {
    setServerError(null);
    try {
      await api.post("/auth/otp/request", values);
      setPhone(values.phone);
      verifyForm.setValue("phone", values.phone);
      setStep("verify");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Failed to send code. Check the number and try again.";
      setServerError(message);
    }
  };

  const onVerifySubmit = async (values: OtpVerifyFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post("/auth/otp/verify", values);
      setAuth(data.data.accessToken, data.data.user);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Invalid or expired code.";
      setServerError(message);
    }
  };

  if (step === "verify") {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Enter verification code
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {phone}
            </span>
          </p>
        </div>

        <form
          onSubmit={verifyForm.handleSubmit(onVerifySubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            label="Verification code"
            placeholder="123456"
            maxLength={6}
            autoComplete="one-time-code"
            error={verifyForm.formState.errors.code?.message}
            {...verifyForm.register("code")}
          />

          {serverError && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
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
          className="mt-4 w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in with phone
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Enter your number to receive a one-time code
        </p>
      </div>

      <form
        onSubmit={requestForm.handleSubmit(onRequestSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          id="phone"
          type="tel"
          label="Phone number"
          placeholder="+254700000000"
          autoComplete="tel"
          error={requestForm.formState.errors.phone?.message}
          {...requestForm.register("phone")}
        />

        {serverError && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          isLoading={requestForm.formState.isSubmitting}
          className="w-full"
        >
          Send code
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Sign in with{" "}
        <a
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          email instead
        </a>
      </p>
    </div>
  );
}
