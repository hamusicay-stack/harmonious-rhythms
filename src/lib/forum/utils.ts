// Shared client-safe helpers for the forum
export function slugify(input: string): string {
  const base = (input || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  if (base) return base;
  return "topic";
}

export function withRandomSuffix(slug: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

export function rankLabel(rank: string): string {
  switch (rank) {
    case "expert": return "מומחה";
    case "veteran": return "ותיק";
    case "regular": return "חבר קהילה";
    case "member": return "חבר";
    default: return "מתחיל";
  }
}
