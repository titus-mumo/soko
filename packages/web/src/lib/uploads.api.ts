import { api } from "./api";
import type { ApiResponse, UserProfile } from "./types";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 10;
export const PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Sets your profile picture; returns your updated profile. */
export async function uploadAvatar(file: File): Promise<UserProfile> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.postForm<ApiResponse<UserProfile>>(
    "/uploads/me/avatar",
    form,
  );
  return data.data;
}

/** Removes your profile picture; returns your updated profile. */
export async function removeAvatar(): Promise<UserProfile> {
  const { data } =
    await api.delete<ApiResponse<UserProfile>>("/uploads/me/avatar");
  return data.data;
}

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
