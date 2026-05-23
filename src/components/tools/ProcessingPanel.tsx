import { Loader2, Download, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { TaskState, TaskResult } from "./useProcessingTask";

interface Props {
  state: TaskState;
  progress: number;
  result: TaskResult | null;
  onDownload: () => void;
  onReset: () => void;
}

export function ProcessingPanel({ state, progress, result, onDownload, onReset }: Props) {
  if (state === "idle") return null;

  if (state === "processing") {
    return (
      <div className="mt-3 rounded-lg border bg-muted/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          מעבד... {Math.round(progress)}%
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="mt-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" /> העיבוד הושלם
        </div>
        {result?.data && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(result.data).map(([k, v]) => (
              <div key={k} className="rounded-md bg-background/60 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
                <div className="font-mono text-sm font-bold">{String(v)}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {result?.download && (
            <Button size="sm" className="flex-1" onClick={onDownload}>
              <Download className="ms-2 h-4 w-4" /> הורד תוצאה
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
