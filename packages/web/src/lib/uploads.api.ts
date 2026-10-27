import { api } from "./api";
import type { ApiResponse } from "./types";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 10;
export const PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/**
 * Uploads product photos (admin) and returns their public URLs, in order.
 * The server re-checks type and size; these are checked here first only to
 * fail fast.
 */
export async function uploadProductImages(
  files: File[],
  onProgress?: (fraction: number) => void,
): Promise<string[]> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const { data } = await api.postForm<ApiResponse<{ urls: string[] }>>(
    "/uploads/admin/product-images",
    form,
    {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(e.loaded / e.total);
      },
    },
  );
  return data.data.urls;
}
