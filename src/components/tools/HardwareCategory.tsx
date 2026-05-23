import { useState } from "react";
import { ToolCard } from "./ToolCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu, Gauge, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Trigger a binary download in the browser */
function downloadBytes(bytes: number[] | Uint8Array, filename: string, mime = "application/octet-stream") {
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * MIDI Tuning Standard — Single Note Tuning Change (Real-Time)
 * F0 7F <device:7F=all> 08 02 <prog:00> <num> [note hi mid lo] ... F7
 * note triplet: semitone integer + 14-bit fractional cents (0..16383 == 0..100c)
 */
function buildMtsSysEx(tunings: Record<string, number>): number[] {
  const entries = Object.entries(tunings).filter(([, c]) => Number.isFinite(c));
  if (entries.length === 0) return [];

  const noteIdx = (n: string) => NOTES.indexOf(n); // 0..11
  const triplets: number[] = [];
  let count = 0;

  for (const [note, cents] of entries) {
    const idx = noteIdx(note);
    if (idx < 0) continue;
    // Apply tuning across 11 octaves (MIDI 0..127)
    for (let oct = 0; oct < 11; oct++) {
      const midiNote = idx + 12 * oct;
      if (midiNote > 127) break;
      const totalSemis = midiNote + cents / 100;
      let intPart = Math.floor(totalSemis);
      let frac = totalSemis - intPart; // 0..1 of a semitone
      if (intPart < 0) { intPart = 0; frac = 0; }
      if (intPart > 127) { intPart = 127; frac = 0; }
      const frac14 = Math.min(16383, Math.max(0, Math.round(frac * 16384)));
      const hi = (frac14 >> 7) & 0x7f;
      const lo = frac14 & 0x7f;
      triplets.push(midiNote & 0x7f, intPart & 0x7f, hi, lo);
      count++;
    }
  }

  return [
    0xf0, 0x7f, 0x7f, 0x08, 0x02, 0x00,
    count & 0x7f,
    ...triplets,
    0xf7,
  ];
}

const GM_RESET: number[] = [0xf0, 0x7e, 0x7f, 0x09, 0x01, 0xf7];

function MiniPiano({
  selected,
  onToggle,
  activeNote,
}: {
  selected: Record<string, number>;
  onToggle: (note: string) => void;
  activeNote: string | null;
}) {
  return (
    <div className="relative flex h-28 w-full select-none">
      {NOTES.map((n, i) => {
        const isBlack = n.includes("#");
        const tuned = selected[n] !== undefined && selected[n] !== 0;
        const focused = activeNote === n;
        if (isBlack) return null;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onToggle(n)}
            className={cn(
              "flex-1 rounded-b-md border border-border bg-background text-[10px] font-bold transition",
              tuned && "bg-primary/20 border-primary text-primary",
              focused && "ring-2 ring-primary"
            )}
            style={{ marginRight: i === NOTES.length - 1 ? 0 : -1 }}
          >
            <span className="block pb-1">{n}</span>
            {tuned && <span className="block text-[9px] font-mono opacity-70">{selected[n] > 0 ? "+" : ""}{selected[n]}</span>}
          </button>
        );
      })}
      <div className="pointer-events-none absolute inset-0 flex">
        {NOTES.map((n, i) => {
          const isBlack = n.includes("#");
          if (!isBlack) return <div key={n} className="flex-1" />;
          const tuned = selected[n] !== undefined && selected[n] !== 0;
          const focused = activeNote === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onToggle(n)}
              className={cn(
                "pointer-events-auto absolute h-16 w-[6%] -translate-x-1/2 rounded-b-md bg-foreground text-[9px] font-bold text-background",
                tuned && "bg-primary text-primary-foreground",
                focused && "ring-2 ring-primary-glow"
              )}
              style={{ left: `${(i / NOTES.length) * 100}%` }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SysExGenerator() {
  const [tunings, setTunings] = useState<Record<string, number>>({});
  const [cents, setCents] = useState([0]);
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const toggle = (note: string) => {
    setActiveNote(note);
    setTunings((p) => ({ ...p, [note]: cents[0] }));
  };

  const exportSyx = () => {
    const bytes = buildMtsSysEx(tunings);
    if (bytes.length === 0) {
      toast.error("בחר לפחות מקש אחד וקבע סטייה לפני הייצוא");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBytes(bytes, `tuning-${stamp}.syx`);
    toast.success(`קובץ .syx נוצר (${bytes.length} בייטים)`);
  };

  const resetHardware = () => {
    downloadBytes(GM_RESET, "gm-reset.syx");
    setTunings({});
    setCents([0]);
    setActiveNote(null);
    toast.success("איפוס GM נוצר והורד (gm-reset.syx)");
  };

  return (
    <ToolCard
      title="SysEx Generator"
      description="כיוונון רבעי-טון לאורגן"
      icon={<Cpu className="h-5 w-5" />}
      badge="חומרה"
    >
      <MiniPiano selected={tunings} onToggle={toggle} activeNote={activeNote} />
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs">סטייה (Cents) {activeNote ? `· ${activeNote}` : ""}</Label>
          <span className="font-mono text-sm font-bold text-primary">
            {cents[0] > 0 ? "+" : ""}{cents[0]}
          </span>
        </div>
        <Slider
          value={cents}
          onValueChange={(v) => {
            setCents(v);
            if (activeNote) setTunings((p) => ({ ...p, [activeNote]: v[0] }));
          }}
          min={-50}
          max={50}
          step={1}
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>-50</span><span>0 · רגיל</span><span>+50 · רבע טון</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="destructive" onClick={resetHardware}>
          <RotateCcw className="ms-2 h-4 w-4" /> איפוס לחומרה
        </Button>
        <Button onClick={exportSyx}>
          <Download className="ms-2 h-4 w-4" /> הורד .syx
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        הקובץ תואם MIDI Tuning Standard (Real-Time SysEx). ייטען לאורגנים תומכים דרך MIDI USB.
      </p>
    </ToolCard>
  );
}

function DigitalTuner() {
  const [mode, setMode] = useState("standard");
  const [ref, setRef] = useState("440");
  const [listening, setListening] = useState(false);

  const toggleMic = async () => {
    if (listening) {
      setListening(false);
      toast.info("המיקרופון הופסק");
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setListening(true);
      toast.success("המיקרופון פעיל — ניתוח גובה צליל בזמן אמת");
    } catch {
      toast.error("לא הוענקה גישה למיקרופון");
    }
  };

  return (
    <ToolCard
      title="Pro Digital Tuner"
      description="מד גובה צליל ויזואלי"
      icon={<Gauge className="h-5 w-5" />}
    >
      <div className="relative mx-auto mt-1 h-28 w-full overflow-hidden rounded-lg border bg-gradient-to-b from-muted/40 to-background">
        <div className="absolute inset-x-0 top-0 flex justify-between px-3 pt-1 text-[10px] text-muted-foreground">
          <span>♭ flat</span><span>● in tune</span><span>sharp ♯</span>
        </div>
        <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-[3px]">
          {Array.from({ length: 31 }).map((_, i) => {
            const center = i === 15;
            return (
              <span
                key={i}
                className={cn(
                  "w-[3px] rounded-full bg-muted-foreground/40",
                  center ? "h-10 bg-primary" : i % 5 === 0 ? "h-7" : "h-4",
                  listening && center && "animate-pulse"
                )}
              />
            );
          })}
        </div>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-3xl font-black text-foreground/90">
          A
        </div>
        <div className="absolute bottom-1 start-2 font-mono text-[10px] text-muted-foreground">{ref} Hz</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">כיוון גיטרה</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard (EADGBE)</SelectItem>
              <SelectItem value="dropd">Drop D</SelectItem>
              <SelectItem value="dadgad">DADGAD</SelectItem>
              <SelectItem value="halfstep">Half-Step Down</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">צליל ייחוס</Label>
          <Select value={ref} onValueChange={setRef}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="432">A432</SelectItem>
              <SelectItem value="440">A440</SelectItem>
              <SelectItem value="442">A442</SelectItem>
              <SelectItem value="444">A444</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="mt-3 w-full" variant={listening ? "default" : "outline"} onClick={toggleMic}>
        {listening ? "עצור מיקרופון" : "הפעל מיקרופון"}
      </Button>
    </ToolCard>
  );
}

export function HardwareCategory() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SysExGenerator />
      <DigitalTuner />
    </div>
  );
}
