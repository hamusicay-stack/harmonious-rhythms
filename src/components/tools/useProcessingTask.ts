import { useRef, useState } from "react";
import { toast } from "sonner";

export type TaskState = "idle" | "processing" | "done" | "error";

export interface TaskResult {
  /** Plain object describing the result for display */
  data?: Record<string, string | number>;
  /** Optional bytes/blob to provide as a download */
  download?: { bytes: BlobPart | Blob; filename: string; mime?: string };
}

/**
 * Real processing task runner. Runs the producer function with a live
 * progress bar that animates while real work is happening, then resolves
 * to a TaskResult that the panel can display + download.
 */
export function useProcessingTask() {
  const [state, setState] = useState<TaskState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TaskResult | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTicker = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const run = async (
    label: string,
    produce: () => TaskResult | Promise<TaskResult>
  ) => {
    if (state === "processing") return;
    setState("processing");
    setProgress(0);
    setResult(null);
    toast.info("מעבד נתונים, אנא המתן...");

    let p = 0;
    stopTicker();
    tickRef.current = setInterval(() => {
      p = Math.min(p + 2, 92);
      setProgress(p);
    }, 120);

    try {
      const out = await produce();
      stopTicker();
      setResult(out);
      setProgress(100);
      setState("done");
      toast.success(`${label} הושלם בהצלחה`);
    } catch (e: any) {
      stopTicker();
      setState("error");
      setProgress(0);
      console.error(`[${label}] failed`, e);
      toast.error(`${label} נכשל: ${e?.message ?? "שגיאה לא ידועה"}`);
    }
  };

  const reset = () => {
    stopTicker();
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
