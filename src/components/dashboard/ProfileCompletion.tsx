import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Trophy } from "lucide-react";

type Profile = {
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  specialties?: string[] | null;
  instagram?: string | null;
  youtube?: string | null;
  website?: string | null;
} | null;

type Step = { key: string; label: string; missingPrompt: string; done: boolean };

export function ProfileCompletion({ profile }: { profile: Profile }) {
  const steps: Step[] = [
    {
      key: "avatar",
      label: "תמונת פרופיל",
      missingPrompt: "העלה תמונת פרופיל כדי להגיע ל-100%!",
      done: !!profile?.avatar_url,
    },
    {
      key: "banner",
      label: "תמונת קאבר",
      missingPrompt: "העלה תמונת קאבר כדי להגיע ל-100%!",
      done: !!profile?.banner_url,
    },
    {
      key: "bio",
      label: "ביוגרפיה",
      missingPrompt: "כתוב ביוגרפיה קצרה כדי שיכירו אותך!",
      done: !!profile?.bio && profile.bio.trim().length >= 10,
    },
    {
      key: "specialties",
      label: "תחומי התמחות",
      missingPrompt: "בחר את תחומי ההתמחות שלך כדי להופיע בחיפושים!",
      done: !!profile?.specialties && profile.specialties.length > 0,
    },
    {
      key: "social",
      label: "קישורים חברתיים",
      missingPrompt: "הוסף קישור לאינסטגרם או יוטיוב כדי לחזק את הנוכחות!",
      done: !!(profile?.instagram || profile?.youtube || profile?.website),
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((s) => !s.done);
  const isComplete = percent === 100;

  return (
    <Card
      className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-amber-500/10 p-5 shadow-lg shadow-amber-500/5"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-md shadow-amber-500/30">
            {isComplete ? <Trophy className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold">
              {isComplete ? "הפרופיל שלך מושלם! 🎉" : "השלם את הפרופיל שלך"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {completed} מתוך {steps.length} שלבים הושלמו
            </p>
          </div>
        </div>
        <div className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
          {percent}%
        </div>
      </div>

      <div className="mt-4">
        <Progress
          value={percent}
          className="h-3 bg-amber-500/10 [&>div]:bg-gradient-to-l [&>div]:from-amber-400 [&>div]:to-amber-600"
        />
      </div>

      {nextStep && (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
          <span className="font-semibold text-amber-700 dark:text-amber-400">השלב הבא:</span>{" "}
          <span className="text-foreground/90">{nextStep.missingPrompt}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {steps.map((s) => (
          <span
            key={s.key}
            className={
              s.done
                ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                : "rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] text-muted-foreground"
            }
          >
            {s.done ? "✓" : "○"} {s.label}
          </span>
        ))}
      </div>
    </Card>
  );
}
