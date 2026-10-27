"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Icon } from "@/components/ui/Icon";
import { AuthHeading, authLinkClass } from "./AuthHeading";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { postLoginPath } from "@/lib/session";
import { apiErrorMessage } from "@/lib/utils";
import { API_URL as API_BASE } from "@/lib/env";

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post("/auth/login", values);
      setAuth(data.data.accessToken, data.data.user);
      // Drop pages cached as a guest before navigating in the new layout.
      router.refresh();
      router.replace(postLoginPath(data.data.user.role));
    } catch (err: unknown) {
      setServerError(apiErrorMessage(err, "Invalid email or password."));
    }
  };

  return (
    <div className="w-full max-w-sm animate-fade-in">
      <AuthHeading
        title="Welcome back"
        subtitle="Sign in to track orders and check out faster."
      />

      <div className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => {
            window.location.href = `${API_BASE}/auth/google`;
          }}
        >
          <GoogleIcon className="h-4 w-4 shrink-0" />
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={() => router.push("/otp")}
        >
          <Icon name="phone" />
          Sign in with phone number
        </Button>
      </div>

      <Divider />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          id="email"
          type="email"
          label="Email"
          inputSize="lg"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          id="password"
          type="password"
          label="Password"
          inputSize="lg"
          placeholder="Your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <FormError message={serverError} />

        <Button
          type="submit"
          size="lg"
          isLoading={isSubmitting}
          className="mt-1 w-full"
        >
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        New to Soko?{" "}
        <Link href="/register" className={authLinkClass}>
          Create an account
        </Link>
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3" role="separator">
      <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      <span className="text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        or with email
      </span>
      <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
