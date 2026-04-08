"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { getProfile, updateProfile, changePassword } from "@/lib/profile.api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileValues,
  type ChangePasswordValues,
} from "@/lib/validations/profile";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const setUser = useAuthStore((s) => s.setUser);
  const authUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const profileForm = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    values: profile
      ? {
          name: profile.name,
          email: profile.email ?? "",
          phone: profile.phone ?? "",
        }
      : undefined,
  });

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (values: UpdateProfileValues) => {
    try {
      const updated = await updateProfile(values);
      setProfile(updated);
      if (authUser) {
        setUser({
          ...authUser,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
        });
      }
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const onPasswordSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password changed");
      passwordForm.reset();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Failed to change password";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-6 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-56 rounded-md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Profile
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your account details
        </p>
      </div>

      {/* Profile links */}
      <div className="flex gap-3 text-sm">
        <Link
          href="/profile/addresses"
          className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Addresses
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">·</span>
        <Link
          href="/profile/seller"
          className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Seller profile
        </Link>
      </div>

      {/* Edit profile */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          Personal info
        </h2>
        <form
          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Full name"
            error={profileForm.formState.errors.name?.message}
            {...profileForm.register("name")}
          />
          <Input
            type="email"
            label="Email"
            error={profileForm.formState.errors.email?.message}
            {...profileForm.register("email")}
          />
          <Input
            type="tel"
            label="Phone"
            placeholder="+254700000000"
            error={profileForm.formState.errors.phone?.message}
            {...profileForm.register("phone")}
          />
          <Button
            type="submit"
            variant="secondary"
            isLoading={profileForm.formState.isSubmitting}
          >
            Save changes
          </Button>
        </form>
      </section>

      {/* Change password */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          Change password
        </h2>
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          className="space-y-4"
          noValidate
        >
          <Input
            type="password"
            label="Current password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register("currentPassword")}
          />
          <Input
            type="password"
            label="New password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register("newPassword")}
          />
          <Input
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register("confirmPassword")}
          />
          <Button
            type="submit"
            variant="secondary"
            isLoading={passwordForm.formState.isSubmitting}
          >
            Update password
          </Button>
        </form>
      </section>
    </div>
  );
}
