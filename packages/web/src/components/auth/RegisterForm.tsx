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
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { normalizeKenyanPhone } from "@/lib/phone";
import { useAuthStore } from "@/store/auth.store";
import { postLoginPath } from "@/lib/session";
import { apiErrorMessage } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post("/auth/register", {
        ...values,
        phone: normalizeKenyanPhone(values.phone),
      });
      setAuth(data.data.accessToken, data.data.user);
      // Drop pages cached as a guest before navigating in the new layout.
      router.refresh();
      router.replace(postLoginPath(data.data.user.role));
    } catch (err: unknown) {
      setServerError(
        apiErrorMessage(err, "Registration failed. Please try again."),
      );
    }
  };

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <AuthHeading
        title="Create your account"
        subtitle="Shop across Kenya and pay with M-Pesa."
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          inputSize="lg"
          id="name"
          type="text"
          label="Full name"
          placeholder="Amina Odhiambo"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          inputSize="lg"
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          inputSize="lg"
          id="phone"
          type="tel"
          label="Phone number"
          placeholder="0712 345 678"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <div>
          <Input
            inputSize="lg"
            id="password"
            type="password"
            label="Password"
            placeholder="Create a password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          {!errors.password && (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              At least 8 characters, with an uppercase letter and a number
            </p>
          )}
        </div>

        <FormError message={serverError} />

        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          className="w-full"
        >
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
