/**
 * Client-side image compression for forum uploads.
 * Scales down to a max dimension and re-encodes as WebP/JPEG.
 * Keeps original animated GIFs / SVGs untouched.
 */
export async function compressForumImage(
  file: File,
  opts: { maxDim?: number; quality?: number; mime?: "image/webp" | "image/jpeg" } = {},
): Promise<File> {
  const { maxDim = 1200, quality = 0.82, mime = "image/webp" } = opts;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), mime, quality),
    );
    // Only swap if the result is actually smaller
    if (blob.size >= file.size) return file;
    const ext = mime === "image/webp" ? "webp" : "jpg";
    const newName = file.name.replace(/\.[a-z0-9]+$/i, "") + "." + ext;
    return new File([blob], newName, { type: mime });
  } catch {
    return file; // fail-open
  }
}
