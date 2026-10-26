"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePassword } from "@/lib/profile.api";
import { toast } from "@/store/toast.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProfileNav } from "@/components/layout/ProfileNav";
import { FormError } from "@/components/ui/FormError";
import { apiErrorMessage } from "@/lib/utils";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/validations/profile";

export default function ChangePasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    setServerError(null);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password changed");
      reset();
    } catch (err) {
      setServerError(apiErrorMessage(err, "Failed to change password"));
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Account
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your account details
        </p>
      </div>

      <ProfileNav />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          type="password"
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <Input
          type="password"
          label="New password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          At least 8 characters, with an uppercase letter and a number.
        </p>

        <FormError message={serverError} />

        <Button type="submit" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}
