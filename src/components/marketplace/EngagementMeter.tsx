import { useEffect, useState, useRef } from "react";
import { Sparkles, Loader2, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { scoreListing } from "@/lib/scoreListing.functions";

export interface EngagementInput {
  title?: string;
  description?: string;
  price?: number | string;
  category?: string;
  brand?: string;
  model?: string;
  year?: number | string;
  item_condition?: string;
  images_count?: number;
  has_audio?: boolean;
  has_video?: boolean;
  city?: string;
}

interface ScoreResult {
  score: number;
  grade: "low" | "medium" | "high";
  tips: string[];
}

interface Props {
  input: EngagementInput;
  /** Auto-recompute when input changes (debounced). Default true. */
  auto?: boolean;
}

/**
 * AI-powered listing engagement meter.
 * Calls the score-listing edge function (Lovable AI) and displays a 0-100 score
 * + concrete improvement tips.
 */
export function EngagementMeter({ input, auto = true }: Props) {
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastKey = useRef<string>("");
  const scoreFn = useServerFn(scoreListing);

  const compute = async () => {
    setLoading(true); setError(null);
    try {
      const data = await scoreFn({ data: input });
      if (data?.error) throw new Error(data.error);
      setResult(data as ScoreResult);
    } catch (e: any) {
      setError(e?.message ?? "החישוב נכשל");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auto) return;
    // Only run if there's enough content
    const key = JSON.stringify(input);
    if (key === lastKey.current) return;
    if (!input.title || (input.title.length < 3) || !input.images_count) return;
    lastKey.current = key;
    const t = setTimeout(compute, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input), auto]);

  const score = result?.score ?? 0;
  const grade = result?.grade ?? "low";
  const gradeColor =
    grade === "high" ? "from-emerald-500 to-emerald-600" :
    grade === "medium" ? "from-amber-500 to-orange-500" :
    "from-rose-500 to-rose-600";
  const gradeLabel = grade === "high" ? "מעולה" : grade === "medium" ? "טוב, אפשר לשפר" : "חלש";
  const gradeIcon = grade === "high" ? CheckCircle2 : grade === "medium" ? TrendingUp : AlertCircle;
  const Icon = gradeIcon;

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">מד אטרקטיביות (AI)</h3>
        </div>
        {!auto && (
          <button type="button" onClick={compute} disabled={loading}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50">
            חשב עכשיו
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          ה-AI מנתח את המודעה...
        </div>
      )}

      {error && !loading && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {result && !loading && (
        <>
          {/* Score bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <Icon className="h-3.5 w-3.5" />
                {gradeLabel}
              </div>
              <div className="font-bold tabular-nums text-sm">{score}/100</div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradeColor} transition-all duration-700`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Tips */}
          {result.tips.length > 0 && (
            <ul className="space-y-1.5 text-xs">
              {result.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!result && !loading && !error && (
        <p className="text-xs text-muted-foreground">
          השלם כותרת, תמונה לפחות אחת ופרטים בסיסיים — והמד יחושב אוטומטית.
        </p>
      )}
    </div>
  );
}
