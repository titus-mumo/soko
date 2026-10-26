"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getSellerProfile,
  createSellerProfile,
  updateSellerProfile,
  uploadVerificationDoc,
} from "@/lib/seller.api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProfileNav } from "@/components/layout/ProfileNav";
import { FormError } from "@/components/ui/FormError";
import { refreshAccessToken } from "@/lib/api";
import { apiErrorMessage } from "@/lib/utils";
import {
  sellerOnboardSchema,
  type SellerOnboardValues,
} from "@/lib/validations/profile";
import type { SellerProfile } from "@/lib/types";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function SellerProfilePage() {
  const user = useAuthStore((s) => s.user);
  const isSeller = user?.role === "seller" || user?.role === "admin";
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(isSeller);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSeller) return;
    getSellerProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [isSeller]);

  const onboarding = !profile;

  const {
    register,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SellerOnboardValues>({
    resolver: zodResolver(sellerOnboardSchema),
    values: profile
      ? {
          storeName: profile.storeName,
          storeSlug: profile.storeSlug,
          storeDescription: profile.storeDescription ?? "",
          storeLogo: profile.storeLogo ?? "",
        }
      : undefined,
  });

  const toPayload = (v: SellerOnboardValues) => ({
    storeName: v.storeName,
    storeSlug: v.storeSlug,
    storeDescription: v.storeDescription || undefined,
    storeLogo: v.storeLogo || undefined,
  });

  const onSubmit = async (values: SellerOnboardValues) => {
    setServerError(null);
    try {
      if (onboarding) {
        const created = await createSellerProfile(toPayload(values));
        // The server upgraded our role, but the access token still says
        // "buyer". Refresh it so seller-only endpoints accept us.
        await refreshAccessToken();
        if (user) useAuthStore.getState().setUser({ ...user, role: "seller" });
        setProfile(created);
        toast.success("Your store is live. Start listing products.");
      } else {
        setProfile(await updateSellerProfile(toPayload(values)));
        toast.success("Store updated");
      }
    } catch (err) {
      setServerError(apiErrorMessage(err, "Something went wrong"));
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

      {loading ? (
        <Skeleton className="h-80 rounded-md" />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {profile ? profile.storeName : "Open a store"}
                </h2>
                {profile && (
                  <Badge variant={profile.isVerified ? "success" : "warning"}>
                    {profile.isVerified ? "Verified" : "Unverified"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {!profile
                  ? "Sell to buyers across Kenya. It takes a minute."
                  : `${profile.totalSales} sale${profile.totalSales !== 1 ? "s" : ""}${
                      Number(profile.rating) > 0
                        ? ` · ${Number(profile.rating).toFixed(1)} rating`
                        : ""
                    }`}
              </p>
            </div>
            {profile && (
              <ButtonLink href="/seller/products" variant="secondary" size="sm">
                My listings
              </ButtonLink>
            )}
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <Input
              label="Store name"
              placeholder="Amina's Electronics"
              error={errors.storeName?.message}
              {...register("storeName", {
                onChange: (e) => {
                  // Suggest a slug while onboarding, until the user edits it.
                  if (onboarding && !getFieldState("storeSlug").isDirty) {
                    setValue("storeSlug", slugify(e.target.value));
                  }
                },
              })}
            />
            <Input
              label="Store URL"
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
              type="url"
              label="Logo URL (optional)"
              placeholder="https://example.com/logo.png"
              error={errors.storeLogo?.message}
              {...register("storeLogo")}
            />

            <FormError message={serverError} />

            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!onboarding && !isDirty}
            >
              {onboarding ? "Create store" : "Save changes"}
            </Button>
          </form>

          {profile && (
            <VerificationDocs
              profile={profile}
              onUploaded={(url) =>
                setProfile((p) =>
                  p
                    ? {
                        ...p,
                        verificationDocs: [...(p.verificationDocs ?? []), url],
                      }
                    : p,
                )
              }
            />
          )}
        </>
      )}
    </div>
  );
}

function VerificationDocs({
  profile,
  onUploaded,
}: {
  profile: SellerProfile;
  onUploaded: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const docs = profile.verificationDocs ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    try {
      new URL(value);
    } catch {
      setError("Enter a valid document URL");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadVerificationDoc(value);
      onUploaded(value);
      setUrl("");
      toast.success("Document submitted for review");
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to submit document"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="space-y-3 border-t border-zinc-100 pt-6 dark:border-zinc-800">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Verification documents
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {profile.isVerified
            ? "Your store is verified."
            : "Submit your ID or business registration (KRA PIN, certificate) to get a verified badge."}
        </p>
      </div>

      {docs.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          No documents submitted
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-highlight">
          {docs.map((doc, i) => (
            <li
              key={`${doc}-${i}`}
              className="flex items-center gap-3 px-3 py-2"
            >
              <span className="text-xs text-zinc-400">{i + 1}.</span>
              <a
                href={doc}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                {doc}
              </a>
            </li>
          ))}
        </ul>
      )}

      {!profile.isVerified && (
        <form onSubmit={handleSubmit} className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              type="url"
              placeholder="https://drive.example.com/kra-pin.pdf"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={error ?? undefined}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            isLoading={uploading}
            disabled={!url.trim()}
          >
            Submit
          </Button>
        </form>
      )}
    </section>
  );
}
