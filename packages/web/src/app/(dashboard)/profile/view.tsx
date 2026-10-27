"use client";

import { useEffect, useState } from "react";
import { ProfileSkeleton } from "@/components/skeletons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getUserProfile, updateProfile } from "@/lib/profile.api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { cardClasses } from "@/components/ui/Card";
import { Avatar } from "@/components/layout/Avatar";
import { ProfileNav } from "@/components/layout/ProfileNav";
import { FormError } from "@/components/ui/FormError";
import { apiErrorMessage, cn } from "@/lib/utils";
import { normalizeKenyanPhone } from "@/lib/phone";
import {
  updateProfileSchema,
  type UpdateProfileValues,
} from "@/lib/validations/profile";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const setUser = useAuthStore((s) => s.setUser);
  const authUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getUserProfile()
      .then(setProfile)
      .catch((err) =>
        setLoadError(apiErrorMessage(err, "Failed to load profile")),
      )
      .finally(() => setLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setFocus,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    values: profile
      ? {
          name: profile.name,
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          profilePhoto: profile.profilePhoto ?? "",
        }
      : undefined,
  });

  const photo = watch("profilePhoto");

  const onSubmit = async (values: UpdateProfileValues) => {
    setServerError(null);
    try {
      // Send only filled fields; the server rejects empty strings.
      const updated = await updateProfile({
        name: values.name,
        email: values.email || undefined,
        phone: values.phone
          ? (normalizeKenyanPhone(values.phone) ?? undefined)
          : undefined,
        profilePhoto: values.profilePhoto || undefined,
      });
      setProfile(updated);
      if (authUser) {
        setUser({
          ...authUser,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
        });
      }
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      setServerError(apiErrorMessage(err, "Failed to update profile"));
    }
  };

  const startEditing = (field: keyof UpdateProfileValues = "name") => {
    setEditing(true);
    // Wait for the form to render before focusing.
    requestAnimationFrame(() => setFocus(field));
  };

  const cancelEditing = () => {
    reset();
    setServerError(null);
    setEditing(false);
  };

  const rows = [
    { label: "Full name", value: profile?.name, field: "name" },
    { label: "Email", value: profile?.email, field: "email" },
    { label: "Phone", value: profile?.phone, field: "phone" },
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Account"
        description="Your details, addresses and security."
      />

      <ProfileNav />

      {loading ? (
        <ProfileSkeleton />
      ) : loadError ? (
        <ErrorState
          title="Couldn't load your profile"
          message={loadError}
          onRetry={() => location.reload()}
        />
      ) : (
        <>
          <section
            className={cardClasses({
              className: "flex flex-wrap items-center gap-5",
            })}
          >
            <div className="group relative rounded-full">
              <Avatar
                name={profile?.name}
                src={photo && !errors.profilePhoto ? photo : null}
                size={80}
              />
              {/* Overlay on hover/focus; always shown on touch screens. */}
              <button
                type="button"
                onClick={() => startEditing("profilePhoto")}
                aria-label="Change profile photo"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-950/55 text-white transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
              >
                <Icon name="camera" size={22} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-semibold text-zinc-950 dark:text-zinc-100">
                {profile?.name}
              </p>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                {profile?.email ?? profile?.phone}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {profile?.role === "admin" && (
                  <Badge tone="purple">Admin</Badge>
                )}
                {profile?.isVerified && (
                  <Badge tone="success">
                    <Icon name="shield" size={12} />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </section>

          <section
            aria-labelledby="details-heading"
            className={cardClasses({ padded: false })}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <h2
                id="details-heading"
                className="text-lg font-semibold text-zinc-950 dark:text-zinc-100"
              >
                Personal details
              </h2>
              {!editing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing()}
                >
                  <Icon name="edit" size={14} />
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="animate-fade-in space-y-5 p-5"
                noValidate
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    id="profile-name"
                    label="Full name"
                    autoComplete="name"
                    error={errors.name?.message}
                    {...register("name")}
                  />
                  <Input
                    id="profile-phone"
                    type="tel"
                    label="Phone"
                    placeholder="0712 345 678"
                    inputMode="tel"
                    autoComplete="tel"
                    error={errors.phone?.message}
                    {...register("phone")}
                  />
                </div>
                <Input
                  id="profile-email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register("email")}
                />
                <Input
                  id="profile-photo"
                  type="url"
                  label="Photo URL (optional)"
                  placeholder="https://"
                  hint="Link to an image hosted elsewhere"
                  error={errors.profilePhoto?.message}
                  {...register("profilePhoto")}
                />

                <FormError message={serverError} />

                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                  <Button type="button" variant="ghost" onClick={cancelEditing}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={!isDirty}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map(({ label, value, field }) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <dt className="w-24 shrink-0 text-[12px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:w-28">
                      {label}
                    </dt>
                    <dd
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        value
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-400 dark:text-zinc-500",
                        field === "phone" && value && "font-mono",
                      )}
                    >
                      {value || "Not set"}
                    </dd>
                    <button
                      type="button"
                      onClick={() => startEditing(field)}
                      className="tap-target rounded text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {value ? "Change" : "Add"}
                      <span className="sr-only"> {label.toLowerCase()}</span>
                    </button>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </>
      )}
    </div>
  );
}
