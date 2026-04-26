/**
 * Sonic Glass — Brand Voice Micro-Copy
 * Time + day aware. Pure functions, no LLM at runtime.
 */

export type CopyKey =
  | "loading"
  | "uploading"
  | "submit"
  | "send"
  | "publish"
  | "noResults"
  | "error"
  | "saved"
  | "addToCart"
  | "cart"
  | "signIn"
  | "signOut"
  | "search"
  | "comment"
  | "like"
  | "share";

interface TimeContext {
  hour: number;       // 0-23
  day: number;        // 0=Sun .. 6=Sat (JS getDay)
}

function getCtx(): TimeContext {
  const d = new Date();
  return { hour: d.getHours(), day: d.getDay() };
}

/** Day+time specific overrides (highest priority) */
function dayOverride(key: CopyKey, { day, hour }: TimeContext): string | null {
  // Friday 11:00 - 17:00 → pre-Shabbat
  if (day === 5 && hour >= 11 && hour < 17 && key === "loading") {
    return "מוריד גיין לקראת שבת...";
  }
  // Motzash: Sat 19:00+ or Sun 4:00-9:00 → fresh week
  const isMotzash = (day === 6 && hour >= 19) || (day === 0 && hour >= 4 && hour < 9);
  if (isMotzash && key === "loading") {
    return "חמם מנועים, מתחילים שבוע...";
  }
  return null;
}

/** Time-of-day variants */
function timeVariant(key: CopyKey, { hour }: TimeContext): string | null {
  if (key !== "loading") return null;
  if (hour >= 6 && hour < 12)  return "מכוון תדרים לבוקר טוב...";
  if (hour >= 12 && hour < 17) return "מחמם את הסטיובים...";
  if (hour >= 17 && hour < 23) return "סשן ערב מתחיל...";
  return "שקט באולפן — לילה טוב...";
}

/** Base dictionary (fallback) — Brand voice: warm, pro, community-first. */
const BASE: Record<CopyKey, string> = {
  loading:    "מכוון תדרים...",
  uploading:  "מקליט את הציוד שלכם...",
  submit:     "הדהד",
  send:       "שלח",
  publish:    "העלה לבמה",
  noResults:  "שקט באולפן — לא נמצאו תוצאות",
  error:      "נראה שיש זיוף קטן, בואו ננסה שוב",
  saved:      "נחתם במאסטר ✓",
  addToCart:  "אורז את הציוד...",
  cart:       "ארגז ציוד",
  signIn:     "כנסו לאולפן",
  signOut:    "סוף סשן",
  search:     "חפשו תו, ז'אנר, אמן או ציוד...",
  comment:    "הוסיפו את הפעימה שלכם",
  like:       "אהבתי",
  share:      "שתפו עם הקהילה",
};

export function getMicroCopy(key: CopyKey): string {
  const ctx = getCtx();
  return dayOverride(key, ctx) ?? timeVariant(key, ctx) ?? BASE[key];
}

/** Convenience aliases */
export const mc = getMicroCopy;
