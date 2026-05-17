import { Sprout, Music, Headphones, Star, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Rank = {
  key: string;
  title: string;
  minPoints: number;
  maxPoints: number | null; // null = top tier
  icon: LucideIcon;
  /** Tailwind utility classes for badge text/border/bg accent */
  colorClass: string;
  /** Hex/oklch CSS color for inline glows */
  accent: string;
};

export const RANKS: Rank[] = [
  {
    key: "newbie",
    title: "ניובי",
    minPoints: 0,
    maxPoints: 100,
    icon: Sprout,
    colorClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    accent: "rgb(16 185 129)",
  },
  {
    key: "enthusiast",
    title: "חובב מוזיקה",
    minPoints: 101,
    maxPoints: 500,
    icon: Music,
    colorClass: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    accent: "rgb(14 165 233)",
  },
  {
    key: "active_player",
    title: "נגן פעיל",
    minPoints: 501,
    maxPoints: 1500,
    icon: Headphones,
    colorClass: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    accent: "rgb(139 92 246)",
  },
  {
    key: "lead_producer",
    title: "מפיק מוביל",
    minPoints: 1501,
    maxPoints: 3000,
    icon: Star,
    colorClass: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accent: "rgb(245 158 11)",
  },
  {
    key: "master",
    title: "מאסטר",
    minPoints: 3001,
    maxPoints: null,
    icon: Crown,
    colorClass:
      "border-rose-500/40 bg-gradient-to-l from-amber-500/15 to-rose-500/15 text-rose-600 dark:text-rose-300",
    accent: "rgb(244 63 94)",
  },
];

export type UserRank = {
  current: Rank;
  next: Rank | null;
  /** How many additional points needed to reach next tier (0 if at top). */
  pointsToNext: number;
  /** 0..1 progress through the current tier. 1 if at top tier. */
  progress: number;
  /** Display string for next-tier prompt, e.g. "עוד 45 נקודות לדרגת מפיק מוביל!". */
  nextLabel: string | null;
};

export function getUserRank(points: number): UserRank {
  const safe = Math.max(0, Math.floor(points || 0));
  const current =
    RANKS.find(
      (r) => safe >= r.minPoints && (r.maxPoints === null || safe <= r.maxPoints),
    ) ?? RANKS[0];

  const idx = RANKS.indexOf(current);
  const next = idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] : null;

  if (!next) {
    return {
      current,
      next: null,
      pointsToNext: 0,
      progress: 1,
      nextLabel: null,
    };
  }

  const pointsToNext = Math.max(0, next.minPoints - safe);
  const span = next.minPoints - current.minPoints;
  const progress = span > 0 ? Math.min(1, Math.max(0, (safe - current.minPoints) / span)) : 0;
  const nextLabel = `עוד ${pointsToNext.toLocaleString("he-IL")} נקודות לדרגת ${next.title}!`;

  return { current, next, pointsToNext, progress, nextLabel };
}
