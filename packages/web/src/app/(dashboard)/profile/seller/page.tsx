"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getSellerProfile,
  createSellerProfile,
  updateSellerProfile,
} from "@/lib/seller.api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  sellerOnboardSchema,
  type SellerOnboardValues,
} from "@/lib/validations/profile";
import type { SellerProfile } from "@/lib/types";

export default function SellerProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getSellerProfile()
      .then(setSellerProfile)
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const isOnboarding = notFound || !sellerProfile;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SellerOnboardValues>({
    resolver: zodResolver(sellerOnboardSchema),
    values: sellerProfile
      ? {
          storeName: sellerProfile.storeName,
          storeSlug: sellerProfile.storeSlug,
          storeDescription: sellerProfile.storeDescription ?? "",
          storeLogo: sellerProfile.storeLogo ?? "",
        }
      : undefined,
  });

  const onSubmit = async (values: SellerOnboardValues) => {
    try {
      if (isOnboarding) {
        const profile = await createSellerProfile({
          storeName: values.storeName,
          storeSlug: values.storeSlug,
          storeDescription: values.storeDescription || undefined,
          storeLogo: values.storeLogo || undefined,
        });
        setSellerProfile(profile);
        setNotFound(false);
        if (user) setUser({ ...user, role: "seller" });
        toast.success("Seller account created! You can now list products.");
      } else {
        const profile = await updateSellerProfile({
          storeName: values.storeName,
          storeSlug: values.storeSlug,
          storeDescription: values.storeDescription || undefined,
          storeLogo: values.storeLogo || undefined,
        });
        setSellerProfile(profile);
        toast.success("Seller profile updated");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Something went wrong";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 rounded-md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 p-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Seller profile
          </h1>
          {sellerProfile?.isVerified && (
            <Badge variant="success">Verified</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {isOnboarding
            ? "Become a seller on Soko to list your products"
            : "Manage your store profile"}
        </p>
      </div>

      {isOnboarding && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-400">
          Fill in your store details to start selling on Soko.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Store name"
          placeholder="Amina's Electronics"
          error={errors.storeName?.message}
          {...register("storeName")}
        />
        <Input
          label="Store slug"
          placeholder="aminas-electronics"
          error={errors.storeSlug?.message}
          {...register("storeSlug")}
        />
        <Textarea
          label="Description (optional)"
          placeholder="Tell buyers about your store…"
          rows={3}
          error={errors.storeDescription?.message}
          {...register("storeDescription")}
        />
        <Input
          label="Store logo URL (optional)"
          placeholder="https://example.com/logo.png"
          error={errors.storeLogo?.message}
          {...register("storeLogo")}
        />
        <Button type="submit" isLoading={isSubmitting}>
          {isOnboarding ? "Become a seller" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
