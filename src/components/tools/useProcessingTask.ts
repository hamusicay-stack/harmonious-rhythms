import { useState } from "react";
import { toast } from "sonner";

export type TaskState = "idle" | "processing" | "done" | "error";

export interface TaskResult {
  /** Plain object describing the result for display */
  data?: Record<string, string | number>;
  /** Optional bytes to provide as a download */
  download?: { bytes: BlobPart; filename: string; mime?: string };
}

/**
 * Generic processing simulator: shows progress 0..100 over `duration` ms,
 * then resolves with a mock result. Toasts in Hebrew.
 */
export function useProcessingTask() {
  const [state, setState] = useState<TaskState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TaskResult | null>(null);

  const run = async (
    label: string,
    produce: () => TaskResult | Promise<TaskResult>,
    duration = 3500
  ) => {
    if (state === "processing") return;
    setState("processing");
    setProgress(0);
    setResult(null);
    toast.info("מעבד נתונים, אנא המתן...");
    const start = Date.now();
    const tick = () => {
      const p = Math.min(99, ((Date.now() - start) / duration) * 100);
      setProgress(p);
      if (p < 99 && state !== "error") setTimeout(tick, 90);
    };
    tick();
    await new Promise((r) => setTimeout(r, duration));
    try {
      const out = await produce();
      setResult(out);
      setProgress(100);
      setState("done");
      toast.success(`${label} הושלם בהצלחה`);
    } catch (e) {
      setState("error");
      toast.error(`${label} נכשל`);
    }
  };

  const reset = () => {
    setState("idle");
    setProgress(0);
    setResult(null);
  };

  const download = () => {
    if (!result?.download) return;
    const { bytes, filename, mime = "application/octet-stream" } = result.download;
    const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success("ההורדה התחילה");
  };

  return { state, progress, result, run, reset, download };
}
