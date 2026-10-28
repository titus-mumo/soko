import Elysia, { t } from "elysia";
import { adminPlugin } from "../../middleware/auth.middleware";
import {
  MAX_IMAGE_BYTES,
  sniffImage,
  StorageError,
  storageConfigured,
  uploadProductImage,
} from "../../lib/storage";

const MAX_FILES = 10;

// Admin — upload product photos (multipart field "files"). Returns their
// public URLs, in order, to save on a listing like any image link.
const UploadProductImages = new Elysia().use(adminPlugin).post(
  "/admin/product-images",
  async (ctx) => {
    const { body, set } = ctx as any;
    if (!storageConfigured()) {
      set.status = 503;
      return {
        success: false,
        message: "Photo uploads aren't set up on the server yet.",
      };
    }
    const files: File[] = ([] as File[]).concat(body.files ?? []);
    if (files.length === 0) {
      set.status = 400;
      return { success: false, message: "Choose at least one photo." };
    }
    if (files.length > MAX_FILES) {
      set.status = 400;
      return {
        success: false,
        message: `Upload at most ${MAX_FILES} photos at a time.`,
      };
    }

    // Check every file before storing any.
    const checked = [];
    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        set.status = 413;
        return { success: false, message: `${file.name} is larger than 5 MB.` };
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const format = sniffImage(bytes);
      if (!format) {
        set.status = 415;
        return {
          success: false,
          message: `${file.name} isn't a JPEG, PNG, WebP or AVIF image.`,
        };
      }
      checked.push({ bytes, format });
    }

    try {
      const urls = await Promise.all(
        checked.map(({ bytes, format }) => uploadProductImage(bytes, format)),
      );
      set.status = 201;
      return { success: true, data: { urls } };
    } catch (err) {
      console.error(err);
      set.status = 502;
      // Admin-only endpoint: say why, so a misconfiguration is fixable.
      return {
        success: false,
        message:
          err instanceof StorageError
            ? `Couldn't store the photos. ${err.message}`
            : `Couldn't reach storage (${err instanceof Error ? err.message : "unknown error"}) — check SUPABASE_URL.`,
      };
    }
  },
  {
    body: t.Object({
      files: t.Union([t.File(), t.Files()]),
    }),
  },
);

export const uploadRoutes = new Elysia().group("/uploads", (app) =>
  app.use(UploadProductImages),
);
