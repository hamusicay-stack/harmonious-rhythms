/**
 * Centralized client-facing error sanitization.
 * Never expose raw Supabase / network error details in the DOM.
 */

const GENERIC = "אירעה שגיאה בעיבוד הבקשה. אנא נסה שוב מאוחר יותר.";

// A short allow-list of safe, user-facing messages we may pass through.
// These are typically validation/business rules already authored in Hebrew.
const SAFE_PREFIXES = [
  "BLOCKED:",
  "יש ל",
  "אין",
  "חובה",
  "לא ניתן",
  "המייל",
  "סיסמה",
  "קוד",
  "כתובת",
  "שם המשתמש",
  "מספר",
  "המודעה",
  "הקובץ",
  "התגובה",
  "כותרת",
  "תיאור",
];

function isSafeMessage(msg: string): boolean {
  const m = msg.trim();
  if (!m || m.length > 200) return false;
  // Block anything that looks like a stack/SQL/URL/key
  if (/https?:\/\//i.test(m)) return false;
  if (/(select |insert |update |delete |from |where |jwt|token|key|policy|rls|sql|postgres|supabase)/i.test(m)) return false;
  if (/[{}<>]/.test(m)) return false;
  return SAFE_PREFIXES.some((p) => m.startsWith(p));
}

export function friendlyError(_err: unknown, fallback: string = GENERIC): string {
  const raw =
    typeof _err === "string"
      ? _err
      : (_err as { message?: string } | null)?.message ?? "";
  return isSafeMessage(raw) ? raw : fallback;
}

/** Internal log helper — keeps detail in console for devs, never returns it. */
export function logError(scope: string, err: unknown): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[${scope}]`, err);
  }
}
