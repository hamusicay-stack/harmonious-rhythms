// Single source of truth for marketplace categories, brands, and cities
export const CATEGORIES = [
  {
    value: "guitars",
    label: "גיטרות",
    subs: ["גיטרה אקוסטית", "גיטרה חשמלית", "גיטרה קלאסית", "גיטרת בס", "יוקליילי", "אחר"],
  },
  {
    value: "keyboards",
    label: "קלידים",
    subs: ["אורגן חשמלי", "אורגנית", "סינטיסייזר", "מקלדת שליטה (MIDI)", "פסנתר חשמלי", "אקורדיון", "אחר"],
  },
  {
    value: "percussion",
    label: "כלי הקשה",
    subs: ["מערכת תופים", "תופים אלקטרוניים", "מצילות (Cymbals)", "קונגות / בונגוס", "קחון", "אחר"],
  },
  {
    value: "pianos",
    label: "פסנתרים",
    subs: ["פסנתר כנף", "פסנתר עומד", "פסנתר דיגיטלי", "אחר"],
  },
  {
    value: "accessories",
    label: "אביזרים לכלי נגינה",
    subs: ["סטנדים", "כיסויים ונרתיקים", "מיתרים", "פדלים", "כבלים ומתאמים", "אוזניות", "אחר"],
  },
  {
    value: "amplification",
    label: "מגברי אודיו",
    subs: ["מגבר גיטרה", "מגבר בס", "מגבר הגברה", "רמקולים פעילים", "מיקסר", "מיקרופון", "אחר"],
  },
  {
    value: "strings",
    label: "כלי מיתר",
    subs: ["כינור", "צ'לו", "ויולה", "קונטרבס", "מנדולינה", "אחר"],
  },
  {
    value: "wind",
    label: "כלי נשיפה",
    subs: ["סקסופון", "חצוצרה", "קלרינט", "חליל", "טרומבון", "אחר"],
  },
  {
    value: "studio",
    label: "אולפן ביתי",
    subs: ["כרטיס קול", "אזניות אולפן", "מוניטורים", "פרוססורים", "מיקרופון אולפן", "אחר"],
  },
  {
    value: "other",
    label: "אחר",
    subs: ["אחר"],
  },
] as const;

export const BRANDS = [
  "YAMAHA", "Roland", "Fender", "Korg", "Pearl", "Alesis", "Cort", "Gibson",
  "Casio", "Epiphone", "Ibanez", "Belarus", "Taylor", "Kawai", "MEDELI",
  "Marshall", "Martin", "Arturia", "Hohner", "JBL", "M-Audio", "Mapex",
  "NAD", "Novation", "Onkyo", "Pearl River", "Tama", "Hoffman", "Otto Meister",
  "Ringway", "Alto", "Artesia", "Kurzweil", "Peavey", "RCF", "Scandalli",
  "Red October", "Aulos", "DB Technologies", "Nord", "Behringer", "Shure",
  "אחר",
] as const;

export const CITIES = [
  "ירושלים", "תל אביב יפו", "חיפה", "ראשון לציון", "פתח תקווה", "אשדוד",
  "נתניה", "באר שבע", "בני ברק", "חולון", "רמת גן", "אשקלון", "רחובות",
  "בת ים", "כפר סבא", "הרצליה", "חדרה", "מודיעין", "נצרת", "רמלה", "לוד",
  "רעננה", "ראש העין", "גבעתיים", "אילת", "קריית אתא", "קריית גת",
  "קריית מוצקין", "קריית ים", "קריית ביאליק", "אופקים", "צפת", "טבריה",
  "עפולה", "דימונה", "ערד", "יבנה", "נס ציונה", "נהריה", "עכו", "כרמיאל",
  "מעלה אדומים", "ביתר עילית", "מודיעין עילית", "אלעד", "גבעת שמואל",
  "אחר",
] as const;

export const CONDITIONS = [
  { value: "new_sealed", label: "חדש באריזה" },
  { value: "like_new", label: "כמו חדש" },
  { value: "used_good", label: "משומש" },
  { value: "for_parts", label: "דרוש תיקון" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);
export const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.value, c.label]),
);
