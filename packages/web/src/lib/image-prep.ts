// Cleans up a photo in the browser before it's uploaded:
//   - trims solid borders (letterbox bars, scanner edges) so the product
//     fills the frame instead of floating in a band of colour;
//   - scales very large photos down (longest side MAX_SIDE), which keeps
//     uploads small and fast.
// Photos it can't read (or that need no change) are returned untouched.

const MAX_SIDE = 2000;
/** How different a pixel may be from the border colour and still count as border (0–255 per channel). */
const TOLERANCE = 18;
/** Ignore a "border" thinner than this share of the side — it's probably the product. */
const MIN_TRIM = 0.02;

export async function prepareImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const { width, height } = bitmap;

  // Read pixels at a modest size to find the borders quickly.
  const scan = Math.min(1, 600 / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scan));
  const sh = Math.max(1, Math.round(height * scan));
  const probe = new OffscreenCanvas(sw, sh);
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx) return file;
  pctx.drawImage(bitmap, 0, 0, sw, sh);
  const px = pctx.getImageData(0, 0, sw, sh).data;
  const at = (x: number, y: number) => {
    const i = (y * sw + x) * 4;
    return [px[i], px[i + 1], px[i + 2]] as const;
  };

  // The border colour: the corners must agree, or there's no solid border.
  const corners = [at(0, 0), at(sw - 1, 0), at(0, sh - 1), at(sw - 1, sh - 1)];
  const near = (a: readonly number[], b: readonly number[]) =>
    Math.abs(a[0] - b[0]) <= TOLERANCE &&
    Math.abs(a[1] - b[1]) <= TOLERANCE &&
    Math.abs(a[2] - b[2]) <= TOLERANCE;
  const bg = corners[0];
  let box = { x: 0, y: 0, w: sw, h: sh };
  if (corners.every((c) => near(c, bg))) {
    // A row/column is border if (almost) all of it matches the border colour.
    const rowIsBorder = (y: number) => {
      let off = 0;
      for (let x = 0; x < sw; x++)
        if (!near(at(x, y), bg) && ++off > sw * 0.01) return false;
      return true;
    };
    const colIsBorder = (x: number, y0: number, y1: number) => {
      let off = 0;
      for (let y = y0; y < y1; y++)
        if (!near(at(x, y), bg) && ++off > (y1 - y0) * 0.01) return false;
      return true;
    };
    let top = 0;
    while (top < sh - 1 && rowIsBorder(top)) top++;
    let bottom = sh;
    while (bottom > top + 1 && rowIsBorder(bottom - 1)) bottom--;
    let left = 0;
    while (left < sw - 1 && colIsBorder(left, top, bottom)) left++;
    let right = sw;
    while (right > left + 1 && colIsBorder(right - 1, top, bottom)) right--;
    const trimmed = top + (sh - bottom) + left + (sw - right);
    if (
      trimmed > Math.min(sw, sh) * MIN_TRIM &&
      right - left > sw * 0.2 &&
      bottom - top > sh * 0.2
    )
      box = { x: left, y: top, w: right - left, h: bottom - top };
  }

  // Back to full-size coordinates.
  const sx = Math.round(box.x / scan);
  const sy = Math.round(box.y / scan);
  const cw = Math.min(width - sx, Math.round(box.w / scan));
  const ch = Math.min(height - sy, Math.round(box.h / scan));
  const shrink = Math.min(1, MAX_SIDE / Math.max(cw, ch));
  const trimmed = cw !== width || ch !== height;
  if (!trimmed && shrink === 1) return file; // nothing to do

  const out = new OffscreenCanvas(
    Math.round(cw * shrink),
    Math.round(ch * shrink),
  );
  const octx = out.getContext("2d");
  if (!octx) return file;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(bitmap, sx, sy, cw, ch, 0, 0, out.width, out.height);
  bitmap.close();

  // PNGs may be transparent: keep PNG. Everything else → WebP (small, sharp).
  const type = file.type === "image/png" ? "image/png" : "image/webp";
  const blob = await out.convertToBlob({ type, quality: 0.9 });
  // If re-encoding somehow made it bigger and nothing was trimmed, keep the original.
  if (!trimmed && blob.size >= file.size) return file;
  const name =
    file.name.replace(/\.[^.]+$/, "") +
    (type === "image/png" ? ".png" : ".webp");
  return new File([blob], name, { type });
}
