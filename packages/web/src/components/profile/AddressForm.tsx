"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormError } from "@/components/ui/FormError";
import { apiErrorMessage } from "@/lib/utils";
import { addressSchema, type AddressValues } from "@/lib/validations/profile";
import type { Address } from "@/lib/types";

/** Add/edit address form, used on the addresses page and inline at checkout. */
export function AddressForm({
  initial,
  counties,
  onSave,
  onCancel,
}: {
  initial?: Address;
  /** Counties we deliver to. Empty → free-text input. */
  counties: string[];
  onSave: (values: AddressValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial
      ? {
          label: initial.label,
          town: initial.town,
          county: initial.county,
          street: initial.street ?? "",
          isDefault: initial.isDefault,
        }
      : { label: "home", isDefault: false },
  });

  // Keep a saved county visible even if it's no longer a delivery zone.
  const countyOptions =
    initial && !counties.includes(initial.county)
      ? [initial.county, ...counties]
      : counties;

  const submit = async (values: AddressValues) => {
    setServerError(null);
    try {
      await onSave(values);
    } catch (err) {
      setServerError(apiErrorMessage(err, "Failed to save address"));
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Input
        label="Label"
        placeholder="home, work, other"
        error={errors.label?.message}
        {...register("label")}
      />
      <Input
        label="Street (optional)"
        placeholder="Kenyatta Ave, Building 4"
        error={errors.street?.message}
        {...register("street")}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Town / City"
          placeholder="Nairobi"
          error={errors.town?.message}
          {...register("town")}
        />
        {countyOptions.length > 0 ? (
          <Select
            label="County"
            placeholder="Select county"
            error={errors.county?.message}
            {...register("county")}
          >
            {countyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="County"
            placeholder="Nairobi"
            error={errors.county?.message}
            {...register("county")}
          />
        )}
      </div>
      <Checkbox label="Set as default address" {...register("isDefault")} />
      <FormError message={serverError} />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initial ? "Save changes" : "Add address"}
        </Button>
      </div>
    </form>
  );
}
