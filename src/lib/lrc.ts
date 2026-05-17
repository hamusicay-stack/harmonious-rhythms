// Lightweight LRC + Enhanced LRC parser.
// Supports standard line timestamps:  [mm:ss.xx] text
// And enhanced word-level timestamps: <mm:ss.xx>word
//
// Output: array of lines, each with start time, full text, and word segments.

export type LrcWord = {
  text: string;       // word + trailing whitespace
  start: number;      // seconds, absolute
};

export type LrcLine = {
  start: number;      // seconds
  end?: number;       // seconds (next line.start by default)
  text: string;       // joined plain text
  words: LrcWord[];   // word-level timeline (falls back to [{text, start}])
};

const TS_RE = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const WTS_RE = /<(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?>/g;

function toSec(min: string, sec: string, frac?: string) {
  const m = Number(min);
  const s = Number(sec);
  const f = frac ? Number(`0.${frac}`) : 0;
  return m * 60 + s + f;
}

export function parseLrc(raw: string): LrcLine[] {
  const out: LrcLine[] = [];
  const lines = raw.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Collect all line timestamps at the head (may have several for repeats).
    const heads: number[] = [];
    let lastIdx = 0;
    TS_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TS_RE.exec(line)) !== null) {
      if (m.index !== lastIdx) break; // stop once timestamps end
      heads.push(toSec(m[1], m[2], m[3]));
      lastIdx = TS_RE.lastIndex;
    }
    if (heads.length === 0) continue;
    const rest = line.slice(lastIdx);
    if (!rest.trim()) continue;

    // Parse enhanced word timestamps inside the rest.
    const words: LrcWord[] = [];
    let cursor = 0;
    let pendingText = "";
    let pendingStart: number | null = null;
    WTS_RE.lastIndex = 0;
    let wm: RegExpExecArray | null;
    while ((wm = WTS_RE.exec(rest)) !== null) {
      const chunk = rest.slice(cursor, wm.index);
      if (chunk) pendingText += chunk;
      if (pendingStart !== null && pendingText) {
        words.push({ text: pendingText, start: pendingStart });
        pendingText = "";
      }
      pendingStart = toSec(wm[1], wm[2], wm[3]);
      cursor = WTS_RE.lastIndex;
    }
    const tail = rest.slice(cursor);
    if (pendingStart !== null) {
      const finalText = (pendingText + tail).trim();
      if (finalText) words.push({ text: finalText + " ", start: pendingStart });
    }

    const plainText = rest.replace(WTS_RE, "").replace(/\s+/g, " ").trim();

    for (const head of heads) {
      // Shift word timings so they're absolute to this head if file used a
      // single line timestamp + relative <...> word markers, or keep them
      // absolute when already in the same domain. Heuristic: if the first
      // word start < head, treat as relative.
      let lineWords = words;
      if (words.length && words[0].start < head) {
        lineWords = words.map((w) => ({ ...w, start: head + w.start }));
      }
      if (!lineWords.length) {
        lineWords = [{ text: plainText, start: head }];
      }
      out.push({ start: head, text: plainText, words: lineWords });
    }
  }

  out.sort((a, b) => a.start - b.start);
  for (let i = 0; i < out.length - 1; i++) out[i].end = out[i + 1].start;
  return out;
}

export function findActiveLine(lines: LrcLine[], t: number): number {
  if (!lines.length) return -1;
  // binary search
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
