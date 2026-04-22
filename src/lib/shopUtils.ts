export const formatILS = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

export const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[\u0590-\u05FF]/g, (c) => c) // keep Hebrew
    .replace(/\s+/g, "-")
    .replace(/[^\w\-\u0590-\u05FF]/g, "")
    .replace(/-+/g, "-");

export const STATUS_TAG_OPTIONS = [
  { value: "bestseller", label: "הכי נמכר", color: "bg-amber-500" },
  { value: "exclusive", label: "בלעדי", color: "bg-purple-600" },
  { value: "new", label: "חדש", color: "bg-emerald-600" },
  { value: "sale", label: "מבצע", color: "bg-red-600" },
  { value: "limited", label: "כמות מוגבלת", color: "bg-orange-600" },
] as const;

export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  physical: "פיזי",
  digital: "דיגיטלי",
  hybrid: "היברידי (פיזי+דיגיטלי)",
};

export const FULFILLMENT_LABEL: Record<string, string> = {
  in_stock: "מלאי עצמי",
  dropship: "דרופשיפינג",
};

export const PRODUCT_STATUS_LABEL: Record<string, string> = {
  draft: "טיוטה",
  active: "פעיל",
  archived: "ארכיון",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  paid: "שולם",
  processing: "בטיפול",
  shipped: "נשלח",
  completed: "הושלם",
  cancelled: "בוטל",
  refunded: "הוחזר",
};
