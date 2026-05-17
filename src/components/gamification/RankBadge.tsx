import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getUserRank } from "@/lib/gamification";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md";

export function RankBadge({
  points,
  size = "sm",
  className,
}: {
  points: number;
  size?: Size;
  className?: string;
}) {
  const { current } = getUserRank(points);
  const Icon = current.icon;
  const sizing =
    size === "xs"
      ? "h-5 gap-0.5 px-1.5 text-[10px]"
      : size === "md"
        ? "h-7 gap-1.5 px-2.5 text-xs"
        : "h-6 gap-1 px-2 text-[11px]";
  const iconSize = size === "xs" ? "h-3 w-3" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <Badge
      variant="outline"
      title={`${current.title} · ${points.toLocaleString("he-IL")} נקודות`}
      className={cn("inline-flex items-center font-medium", sizing, current.colorClass, className)}
    >
      <Icon className={iconSize} />
      {current.title}
    </Badge>
  );
}

export function RankXpBar({ points, className }: { points: number; className?: string }) {
  const { current, next, pointsToNext, progress, nextLabel } = getUserRank(points);
  const Icon = current.icon;
  const percent = Math.round(progress * 100);

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/20 bg-gradient-to-l from-amber-500/5 via-background to-amber-500/10 p-4",
        className,
      )}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full shadow-md"
            style={{
              backgroundColor: `color-mix(in oklab, ${current.accent} 18%, transparent)`,
              color: current.accent,
              boxShadow: `0 0 16px color-mix(in oklab, ${current.accent} 30%, transparent)`,
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">{current.title}</div>
            <div className="text-[11px] text-muted-foreground">
              {points.toLocaleString("he-IL")} XP
            </div>
          </div>
        </div>
        <div className="text-xs font-semibold tabular-nums text-muted-foreground">
          {next ? `${percent}%` : "דרגה מקסימלית 🏆"}
        </div>
      </div>

      {next && (
        <>
          <Progress
            value={percent}
            className="mt-3 h-2.5 bg-amber-500/10 [&>div]:bg-gradient-to-l [&>div]:from-amber-400 [&>div]:to-amber-600"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{nextLabel}</span>{" "}
            <span>
              ({pointsToNext.toLocaleString("he-IL")} מתוך{" "}
              {(next.minPoints - current.minPoints).toLocaleString("he-IL")})
            </span>
          </p>
        </>
      )}
    </div>
  );
}
