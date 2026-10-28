"use client";

import { useRef, useState } from "react";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_UPLOAD,
  PHOTO_TYPES,
  uploadProductImages,
} from "@/lib/uploads.api";
import { prepareImage } from "@/lib/image-prep";
import { toast } from "@/store/toast.store";
import { Icon } from "@/components/ui/Icon";
import { apiErrorMessage, cn } from "@/lib/utils";

/**
 * Drop photos here or pick them from the device (phones get the camera
 * option too). Uploads straight away and hands back the public URLs.
 */
export function ImageUploader({
  onUploaded,
  disabled = false,
}: {
  onUploaded: (urls: string[]) => void | Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const busy = progress !== null;

  const accept = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0 || busy) return;
    if (files.length > MAX_PHOTOS_PER_UPLOAD)
      return toast.error(
        `Upload at most ${MAX_PHOTOS_PER_UPLOAD} photos at a time.`,
      );
    const wrongType = files.find((f) => !PHOTO_TYPES.includes(f.type));
    if (wrongType)
      return toast.error(
        `${wrongType.name} isn't a JPEG, PNG, WebP or AVIF image.`,
      );

    setProgress(0);
    try {
      // Trim solid borders and shrink huge photos before checking the size.
      const prepared = await Promise.all(files.map(prepareImage));
      const tooBig = prepared.find((f) => f.size > MAX_PHOTO_BYTES);
      if (tooBig) {
        toast.error(`${tooBig.name} is larger than 5 MB, even after resizing.`);
        return;
      }
      const urls = await uploadProductImages(prepared, setProgress);
      await onUploaded(urls);
      toast.success(
        `${urls.length} photo${urls.length === 1 ? "" : "s"} uploaded`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't upload the photos"));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) accept(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragging
          ? "border-brand-500 bg-brand-600/[0.06]"
          : "border-zinc-300 dark:border-zinc-700",
        (disabled || busy) && "opacity-70",
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600/10 text-brand-700 dark:text-brand-400">
        <Icon
          name={busy ? "refresh" : "plus"}
          className={cn(busy && "animate-spin")}
        />
      </span>
      {busy ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
          Uploading… {Math.round((progress ?? 0) * 100)}%
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="font-medium text-brand-700 underline-offset-2 hover:underline disabled:cursor-not-allowed dark:text-brand-400"
            >
              Upload photos
            </button>{" "}
            or drag them here
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            JPEG, PNG, WebP or AVIF · up to 5 MB each · {MAX_PHOTOS_PER_UPLOAD}{" "}
            at a time
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => accept(e.target.files)}
      />
    </div>
  );
}
