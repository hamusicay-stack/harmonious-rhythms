export const SPECIALTIES = [
  { value: "keyboardist_events", label: "קלידן לאירועים" },
  { value: "wedding_singer", label: "זמר חופות" },
  { value: "studio_arranger", label: "מעבד אולפן" },
  { value: "mix_engineer", label: "טכנאי מיקס" },
  { value: "music_teacher", label: "מורה לנגינה" },
  { value: "drummer", label: "מתופף" },
  { value: "guitarist", label: "גיטריסט" },
  { value: "bassist", label: "באסיסט" },
  { value: "vocalist", label: "זמר/ת" },
  { value: "sound_tech", label: "טכנאי הגברה" },
] as const;

export const GENRES = [
  { value: "hasidic", label: "חסידי" },
  { value: "pop", label: "פופ" },
  { value: "mizrahi", label: "מזרחי" },
  { value: "electronic", label: "אלקטרוני" },
  { value: "classical", label: "קלאסי" },
  { value: "jazz", label: "ג׳אז" },
  { value: "rock", label: "רוק" },
  { value: "folk", label: "פולק" },
] as const;

export const REGIONS = [
  "ירושלים והסביבה",
  "מרכז",
  "תל אביב",
  "שרון",
  "שפלה",
  "צפון",
  "דרום",
  "יו״ש",
  "חו״ל",
] as const;

export const EVENT_TYPES = [
  { value: "wedding", label: "חתונה" },
  { value: "bar_mitzvah", label: "בר מצווה" },
  { value: "private", label: "אירוע פרטי" },
  { value: "studio", label: "אולפן" },
  { value: "lesson", label: "שיעור" },
  { value: "other", label: "אחר" },
] as const;

export const PACKAGE_UNITS = [
  { value: "event", label: "לאירוע" },
  { value: "hour", label: "לשעה" },
  { value: "song", label: "לשיר" },
  { value: "package", label: "חבילה" },
] as const;

export const labelOf = (
  list: readonly { value: string; label: string }[],
  value: string,
): string => list.find((x) => x.value === value)?.label ?? value;
