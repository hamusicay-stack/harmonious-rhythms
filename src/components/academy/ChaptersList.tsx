import { useMemo } from "react";
import { Clock } from "lucide-react";

export type Chapter = { seconds: number; label: string; raw: string };

/**
 * Parses YouTube-style chapter timestamps from text.
 * Examples matched: "0:30 Intro", "05:20 - Topic", "1:23:45 Section"
 */
export function parseChapters(text: string | null | undefined): Chapter[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const out: Chapter[] = [];
  const re = /^\s*[\-•*]?\s*\(?(\d{1,2}):(\d{2})(?::(\d{2}))?\)?\s*[-–—:]?\s*(.+?)\s*$/;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const c = m[3] ? parseInt(m[3], 10) : null;
    const seconds = c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
    const label = m[4].trim();
    if (!label || label.length < 2) continue;
    out.push({ seconds, label, raw: line });
  }
  // Dedup & sort
  const seen = new Set<number>();
  return out
    .filter((c) => (seen.has(c.seconds) ? false : (seen.add(c.seconds), true)))
    .sort((a, b) => a.seconds - b.seconds);
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function ChaptersList({
  text,
  onSeek,
}: {
  text: string | null | undefined;
  onSeek?: (seconds: number) => void;
}) {
  const chapters = useMemo(() => parseChapters(text), [text]);
  if (chapters.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-3">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Clock className="h-4 w-4 text-primary" />פרקים
      </h4>
      <ol className="space-y-1">
        {chapters.map((c) => (
          <li key={c.seconds}>
            <button
              type="button"
              onClick={() => onSeek?.(c.seconds)}
              className="group flex w-full items-baseline gap-2 rounded px-2 py-1 text-start text-sm transition hover:bg-primary/10"
            >
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                {fmt(c.seconds)}
              </span>
              <span className="flex-1 text-foreground">{c.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
