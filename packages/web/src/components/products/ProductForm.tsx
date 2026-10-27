"use client";

import { useState, useEffect } from "react";
import { FormActions, FormSection } from "@/components/ui/FormSection";
import { Icon } from "@/components/ui/Icon";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { SafeImage } from "@/components/ui/SafeImage";
import { ImageUploader } from "./ImageUploader";
import {
  productSchema,
  type ProductFormValues,
} from "@/lib/validations/product";
import { getRootCategories, getSubCategories } from "@/lib/categories.api";
import { apiErrorMessage } from "@/lib/utils";
import type { Product, ProductVariant } from "@/lib/types";

interface ProductFormProps {
  initialData?: Product & { variants: ProductVariant[]; tags: string[] };
  onSubmit: (values: ProductFormValues) => Promise<void>;
  submitLabel?: string;
  /** Show image URL fields (create only — edit has its own image manager). */
  withImages?: boolean;
}

interface CategoryOption {
  id: string;
  label: string;
}

export function ProductForm({
  initialData,
  onSubmit,
  submitLabel = "Save product",
  withImages = false,
}: ProductFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    // Root categories plus one level of sub-categories, as "Parent › Child".
    getRootCategories()
      .then(async (roots) => {
        const subs = await Promise.all(
          roots.map((r) => getSubCategories(r.id).catch(() => [])),
        );
        setCategories(
          roots.flatMap((r, i) => [
            { id: r.id, label: r.name },
            ...subs[i].map((c) => ({
              id: c.id,
              label: `${r.name} › ${c.name}`,
            })),
          ]),
        );
      })
      .catch(() => setServerError("Couldn't load categories."))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          slug: initialData.slug,
          description: initialData.description ?? "",
          categoryId: initialData.categoryId,
          condition: initialData.condition,
          variants: initialData.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            price: v.price,
            stockQuantity: v.stockQuantity,
            size: v.size ?? "",
            color: v.color ?? "",
            material: v.material ?? "",
          })),
          tags: initialData.tags.join(", "),
        }
      : {
          condition: "new",
          variants: [{ sku: "", price: "", stockQuantity: 0 }],
          images: [],
        },
  });

  // The category <select> has no options until they load, so the browser
  // drops the default value. Re-apply it once options exist.
  useEffect(() => {
    if (!categoriesLoading && initialData) {
      reset({ ...getValues(), categoryId: initialData.categoryId });
    }
  }, [categoriesLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  const imageFields = useFieldArray({ control, name: "images" });

  const handleFormSubmit = async (values: ProductFormValues) => {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      setServerError(apiErrorMessage(err, "Something went wrong. Try again."));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
      noValidate
    >
      <FormSection
        title="Details"
        description="What you're selling and where buyers find it."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Product name"
            placeholder="iPhone 15 Pro"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Slug"
            placeholder="iphone-15-pro"
            error={errors.slug?.message}
            {...register("slug")}
          />
        </div>

        <Textarea
          label="Description (optional)"
          placeholder="Describe the product…"
          rows={4}
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Category"
            placeholder={categoriesLoading ? "Loading…" : "Select category"}
            disabled={categoriesLoading}
            error={errors.categoryId?.message}
            {...register("categoryId")}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            label="Condition"
            error={errors.condition?.message}
            {...register("condition")}
          >
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </Select>
        </div>

        <Input
          label="Tags (optional)"
          placeholder="electronics, phone, apple (comma-separated)"
          error={errors.tags?.message}
          {...register("tags")}
        />
      </FormSection>

      <FormSection
        title="Variants"
        description="Each size, colour or model with its own price and stock."
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append({ sku: "", price: "", stockQuantity: 0 })}
          >
            <Icon name="plus" size={14} />
            Add variant
          </Button>
        }
      >
        {errors.variants?.root && (
          <p className="mb-2 text-xs text-red-500">
            {errors.variants.root.message}
          </p>
        )}
        <div className="space-y-3">
          {fields.map((field, i) => (
            <fieldset
              key={field.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <legend className="sr-only">Variant {i + 1}</legend>
              <div className="flex items-start gap-3">
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label={`Variant ${i + 1} SKU`}
                    hideLabel
                    placeholder="SKU"
                    error={errors.variants?.[i]?.sku?.message}
                    {...register(`variants.${i}.sku`)}
                  />
                  <Input
                    label={`Variant ${i + 1} price (KES)`}
                    hideLabel
                    placeholder="Price (e.g. 1500.00)"
                    inputMode="decimal"
                    error={errors.variants?.[i]?.price?.message}
                    {...register(`variants.${i}.price`)}
                  />
                  <Input
                    label={`Variant ${i + 1} stock`}
                    hideLabel
                    type="number"
                    min={0}
                    placeholder="Stock"
                    error={errors.variants?.[i]?.stockQuantity?.message}
                    {...register(`variants.${i}.stockQuantity`)}
                  />
                  <Input
                    label={`Variant ${i + 1} size`}
                    hideLabel
                    placeholder="Size (optional)"
                    {...register(`variants.${i}.size`)}
                  />
                  <Input
                    label={`Variant ${i + 1} color`}
                    hideLabel
                    placeholder="Color (optional)"
                    {...register(`variants.${i}.color`)}
                  />
                  <Input
                    label={`Variant ${i + 1} material`}
                    hideLabel
                    placeholder="Material (optional)"
                    {...register(`variants.${i}.material`)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label={`Remove variant ${i + 1}`}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            </fieldset>
          ))}
        </div>
      </FormSection>

      {withImages && (
        <FormSection
          title="Photos"
          description="Upload photos or paste image links. The first one is the main photo."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => imageFields.append({ url: "" })}
            >
              <Icon name="plus" size={14} />
              Add link
            </Button>
          }
        >
          <ImageUploader
            onUploaded={(urls) =>
              imageFields.append(urls.map((url) => ({ url })))
            }
          />
          {imageFields.fields.length > 0 && (
            <div className="mt-4 space-y-2">
              {imageFields.fields.map((field, i) => (
                <div key={field.id} className="flex items-start gap-2">
                  <ImagePreview url={watch(`images.${i}.url`)} />
                  <div className="flex-1">
                    <Input
                      label={`Image ${i + 1} URL${i === 0 ? " (primary)" : ""}`}
                      hideLabel
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      error={errors.images?.[i]?.url?.message}
                      {...register(`images.${i}.url`)}
                    />
                  </div>
                  {i === 0 && (
                    <span className="mt-2.5 rounded-full bg-brand-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                      Primary
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => imageFields.remove(i)}
                    aria-label={`Remove image ${i + 1}`}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      )}

      <FormError message={serverError} />

      <FormActions>
        <Button type="submit" size="lg" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}

/** A small thumbnail beside an image link, once it looks like a URL. */
function ImagePreview({ url }: { url?: string }) {
  const valid = !!url && /^https?:\/\/\S+$/.test(url);
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
      {valid && (
        <SafeImage
          src={url!}
          alt=""
          fill
          sizes="40px"
          className="object-cover"
        />
      )}
    </div>
  );
}
