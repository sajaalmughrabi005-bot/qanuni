/** Client-side avatar prep: validates the file and downsizes it to a small JPEG data URL. */
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 5 * 1024 * 1024;

export async function resizeImageToDataUrl(file: File, maxSide = 256): Promise<string | null> {
  if (!ALLOWED.includes(file.type) || file.size > MAX_INPUT_BYTES) return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
