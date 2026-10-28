import Elysia, { t } from "elysia";
import { adminPlugin, authPlugin } from "../../middleware/auth.middleware";
import { getRepositories } from "../../lib/repositories";
import { selfUser } from "../../lib/views";
import {
  MAX_AVATAR_BYTES,
  MAX_IMAGE_BYTES,
  deleteAvatar,
  uploadAvatar,
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

// Signed-in user — set or replace your profile picture (field "file").
const UploadAvatar = new Elysia().use(authPlugin).post(
  "/me/avatar",
  async (ctx) => {
    const { userId, body, set } = ctx as any;
    if (!storageConfigured()) {
      set.status = 503;
      return {
        success: false,
        message: "Photo uploads aren't available right now.",
      };
    }
    const file: File = body.file;
    if (file.size > MAX_AVATAR_BYTES) {
      set.status = 413;
      return { success: false, message: "Your photo must be 2 MB or smaller." };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const format = sniffImage(bytes);
    if (!format) {
      set.status = 415;
      return {
        success: false,
        message: "Use a JPEG, PNG, WebP or AVIF photo.",
      };
    }

    const { userRepository } = getRepositories();
    const before = await userRepository.findUserById(userId);
    if (!before) {
      set.status = 404;
      return { success: false, message: "User not found." };
    }
    try {
      const url = await uploadAvatar(userId, bytes, format);
      const updated = await userRepository.updateUser(userId, {
        profilePhoto: url,
      });
      if (before.profilePhoto && before.profilePhoto !== url)
        await deleteAvatar(before.profilePhoto);
      set.status = 201;
      return {
        success: true,
        data: selfUser(updated ?? { ...before, profilePhoto: url }),
      };
    } catch (err) {
      console.error(err);
      set.status = 502;
      return {
        success: false,
        message: "Couldn't save your photo. Please try again.",
      };
    }
  },
  { body: t.Object({ file: t.File() }) },
);

// Signed-in user — remove your profile picture.
const RemoveAvatar = new Elysia()
  .use(authPlugin)
  .delete("/me/avatar", async (ctx) => {
    const { userId, set } = ctx as any;
    const { userRepository } = getRepositories();
    const before = await userRepository.findUserById(userId);
    if (!before) {
      set.status = 404;
      return { success: false, message: "User not found." };
    }
    const updated = await userRepository.updateUser(userId, {
      profilePhoto: null,
    });
    if (before.profilePhoto) await deleteAvatar(before.profilePhoto);
    return {
      success: true,
      data: selfUser(updated ?? { ...before, profilePhoto: null }),
    };
  });

export const uploadRoutes = new Elysia().group("/uploads", (app) =>
  app.use(UploadProductImages).use(UploadAvatar).use(RemoveAvatar),
);
