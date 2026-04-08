"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

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
      const { data } = await api.post("/auth/register", values);
      setAuth(data.data.accessToken, data.data.user);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Registration failed. Please try again.";
      setServerError(message);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Join Soko — Kenya&apos;s marketplace
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          id="name"
          type="text"
          label="Full name"
          placeholder="Amina Odhiambo"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <div className="flex flex-col gap-1.5">
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          {!errors.password && (
            <p className="text-xs text-zinc-400 dark:text-zinc-600">
              Min. 8 characters, one uppercase, one number
            </p>
          )}
        </div>

        {serverError && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
            {serverError}
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
