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

function MiniPiano({
  selected,
  onToggle,
}: {
  selected: Record<string, number>;
  onToggle: (note: string) => void;
}) {
  return (
    <div className="relative flex h-28 w-full select-none">
      {NOTES.map((n, i) => {
        const isBlack = n.includes("#");
        const active = selected[n] !== undefined && selected[n] !== 0;
        if (isBlack) return null;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onToggle(n)}
            className={cn(
              "flex-1 rounded-b-md border border-border bg-background text-[10px] font-bold transition",
              active && "bg-primary/20 border-primary text-primary"
            )}
            style={{ marginRight: i === NOTES.length - 1 ? 0 : -1 }}
          >
            <span className="block pb-1">{n}</span>
          </button>
        );
      })}
      <div className="pointer-events-none absolute inset-0 flex">
        {NOTES.map((n, i) => {
          const isBlack = n.includes("#");
          if (!isBlack) return <div key={n} className="flex-1" />;
          const active = selected[n] !== undefined && selected[n] !== 0;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onToggle(n)}
              className={cn(
                "pointer-events-auto absolute h-16 w-[6%] -translate-x-1/2 rounded-b-md bg-foreground text-[9px] font-bold text-background",
                active && "bg-primary text-primary-foreground"
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

  return (
    <ToolCard
      title="SysEx Generator"
      description="כיוונון רבעי-טון לאורגן"
      icon={<Cpu className="h-5 w-5" />}
      badge="חומרה"
    >
      <MiniPiano selected={tunings} onToggle={toggle} />
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
        <Button variant="destructive" onClick={() => { setTunings({}); setCents([0]); toast.success("איפוס לחומרה נשלח"); }}>
          <RotateCcw className="ml-2 h-4 w-4" /> איפוס לחומרה
        </Button>
        <Button onClick={() => toast.info("בקרוב — ייצוא .syx")}>
          <Download className="ml-2 h-4 w-4" /> הורד .syx
        </Button>
      </div>
    </ToolCard>
  );
}

function DigitalTuner() {
  const [mode, setMode] = useState("standard");
  const [ref, setRef] = useState("440");

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
                  center ? "h-10 bg-primary" : i % 5 === 0 ? "h-7" : "h-4"
                )}
              />
            );
          })}
        </div>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-3xl font-black text-foreground/90">
          A
        </div>
        <div className="absolute bottom-1 left-2 font-mono text-[10px] text-muted-foreground">{ref} Hz</div>
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
      <Button className="mt-3 w-full" variant="outline" onClick={() => toast.info("בקרוב — הפעלת מיקרופון")}>
        הפעל מיקרופון
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
