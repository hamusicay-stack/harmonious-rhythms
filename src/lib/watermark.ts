// Client-side watermark for marketplace images & shorts thumbnails.
// Stamps "המוזיקאי" diagonally across the image with low opacity + a corner badge.

export async function watermarkImage(file: File, text = "המוזיקאי"): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const w = bitmap.width;
    const h = bitmap.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    // Diagonal watermark text repeating
    const fontSize = Math.max(18, Math.floor(Math.min(w, h) * 0.045));
    ctx.font = `600 ${fontSize}px "Heebo", "Arial", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = Math.max(1, fontSize * 0.05);
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    const tile = fontSize * 8;
    for (let y = -h; y < h; y += tile) {
      for (let x = -w; x < w; x += tile * 1.2) {
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }
    }
    ctx.restore();

    // Corner badge: solid plate with the brand name
    const padding = Math.floor(fontSize * 0.6);
    const badgeFont = Math.max(14, Math.floor(Math.min(w, h) * 0.035));
    ctx.font = `700 ${badgeFont}px "Heebo", "Arial", sans-serif`;
    const metrics = ctx.measureText(text);
    const badgeW = metrics.width + padding * 2;
    const badgeH = badgeFont + padding;
    const x = w - badgeW - padding;
    const y = h - badgeH - padding;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, x, y, badgeW, badgeH, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(212,162,78,1)"; // gold
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padding, y + badgeH / 2);

    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), outType, 0.9)
    );
    const newName = file.name.replace(/(\.[a-z0-9]+)?$/i, outType === "image/png" ? ".png" : ".jpg");
    return new File([blob], newName, { type: outType });
  } catch {
    return file; // fail-open: never block uploads
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const min = Math.min(w, h) / 2;
  const radius = Math.min(r, min);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Generate a watermarked poster (JPEG) from the first frame of a video file.
// Used for shorts thumbnails when the user uploads from camera roll.
export async function watermarkVideoPoster(file: File, text = "המוזיקאי"): Promise<File | null> {
  if (!file.type.startsWith("video/")) return null;
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video load failed"));
    });
    video.currentTime = Math.min(1, (video.duration || 1) / 2);
    await new Promise((r) => setTimeout(r, 250));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }
    ctx.drawImage(video, 0, 0);
    URL.revokeObjectURL(url);
    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.85)
    );
    const posterFile = new File([blob], "poster.jpg", { type: "image/jpeg" });
    return await watermarkImage(posterFile, text);
  } catch {
    return null;
  }
}
