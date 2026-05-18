import { useState } from "react";
import { ToolCard } from "./ToolCard";
import { Dropzone } from "./Dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, FileMusic, Layers, Sparkles, Download, Youtube } from "lucide-react";
import { toast } from "sonner";
import { useProcessingTask } from "./useProcessingTask";
import { ProcessingPanel } from "./ProcessingPanel";
import { decodeAudioFile, analyzeKeyAndTempo } from "@/lib/audioTools";

const PROGRESSIONS_BY_MOOD: Record<string, string[][]> = {
  happy: [["C", "G", "Am", "F"], ["G", "D", "Em", "C"]],
  sad: [["Am", "F", "C", "G"], ["Dm", "Bb", "F", "C"]],
  epic: [["Em", "C", "G", "D"], ["Am", "F", "C", "G"]],
  chill: [["Cmaj7", "Em7", "Fmaj7", "G7"], ["Am7", "Dm7", "G7", "Cmaj7"]],
  tense: [["Dm", "A", "Dm", "Gm"], ["Em", "B7", "Em", "Am"]],
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function AnalysisCategory() {
  const [stems, setStems] = useState({ vocals: true, drums: false, bass: false, denoise: false });
  const [ytUrl, setYtUrl] = useState("");
  const [mood, setMood] = useState("happy");

  const analyzer = useProcessingTask();
  const sheetMusic = useProcessingTask();
  const splitter = useProcessingTask();
  const progGen = useProcessingTask();

  const handleFile = (cb: (f: File) => void) => (files: File[]) => {
    if (files[0]) {
      toast.success("הקובץ הועלה בהצלחה");
      cb(files[0]);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToolCard title="Smart Analyzer" description="זיהוי סולם ו-BPM אמיתי (Web Audio + YIN)" icon={<Brain className="h-5 w-5" />} badge="Web Audio">
        <div className="space-y-2">
          <Label className="text-xs">קישור YouTube (לא נתמך מהדפדפן)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Youtube className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="https://youtube.com/..."
                className="pr-8"
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                disabled
              />
            </div>
            <Button disabled variant="outline">דורש שרת</Button>
          </div>
          <div className="text-center text-[11px] text-muted-foreground">— העלה קובץ אודיו אמיתי —</div>
          <Dropzone hint="ניתוח אמיתי של ספקטרום + תדרים" onFiles={handleFile((f) => {
            analyzer.run("ניתוח", async () => {
              const buf = await decodeAudioFile(f);
              const result = await analyzeKeyAndTempo(buf);
              const txt = `Analysis: ${f.name}\nKey: ${result.key}\nBPM: ${result.bpm}\nChords: ${result.chords.join(" → ")}\nDuration: ${buf.duration.toFixed(1)}s\nSample Rate: ${buf.sampleRate} Hz\n`;
              return {
                data: { "סולם": result.key, BPM: result.bpm, "אקורדים": result.chords.join(" → ") },
                download: { bytes: txt, filename: `${f.name.replace(/\.[^.]+$/, "")}-analysis.txt`, mime: "text/plain" },
              };
            });
          })} />
        </div>
        <ProcessingPanel {...analyzer} onDownload={analyzer.download} onReset={analyzer.reset} />
      </ToolCard>

      <ToolCard title="גנרטור תווים" description="ניתוח אקורדים והפקת חוברת" icon={<FileMusic className="h-5 w-5" />}>
        <Dropzone hint="העלה אודיו לניתוח אקורדים" onFiles={handleFile((f) => {
          sheetMusic.run("יצירת תווים", async () => {
            const buf = await decodeAudioFile(f);
            const result = await analyzeKeyAndTempo(buf);
            // Real text-based "lead sheet" derived from the analysis
            const sheet = `LEAD SHEET — ${f.name}\n` +
              `Key: ${result.key}   BPM: ${result.bpm}\n` +
              `${"─".repeat(40)}\n\n` +
              result.chords.concat(result.chords).map((c, i) => `Bar ${i + 1}: | ${c.padEnd(8)} |`).join("\n");
            return {
              data: { "סולם": result.key, BPM: result.bpm, "אקורדים": result.chords.join(" → ") },
              download: { bytes: sheet, filename: `${f.name.replace(/\.[^.]+$/, "")}-leadsheet.txt`, mime: "text/plain" },
            };
          });
        })} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">סולם</Label>
            <Select defaultValue="auto">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">זיהוי אוטומטי</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">פורמט</Label>
            <Select defaultValue="txt">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">Lead Sheet (.txt)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ProcessingPanel {...sheetMusic} onDownload={sheetMusic.download} onReset={sheetMusic.reset} />
      </ToolCard>

      <ToolCard title="Stem Splitter & Denoise" description="פיצול ערוצים דורש שרת AI" icon={<Layers className="h-5 w-5" />} badge="דורש שרת">
        <Dropzone hint="פיצול ערוצים אמיתי דורש מודל AI חיצוני" onFiles={handleFile(() => {
          splitter.run("פיצול ערוצים", async () => {
            throw new Error("פיצול stems אמיתי דורש מודל AI שרצה בשרת. השאר את הקובץ — נחבר כשיהיה זמין.");
          });
        })} />
        <div className="mt-3 space-y-2">
          {[
            { key: "vocals", label: "חילוץ ווקאל" },
            { key: "drums", label: "חילוץ תופים" },
            { key: "bass", label: "חילוץ באס" },
            { key: "denoise", label: "ניקוי רעשי רקע" },
          ].map((o) => (
            <div key={o.key} className="flex items-center justify-between rounded-md border bg-card/50 px-3 py-2">
              <Label className="text-sm">{o.label}</Label>
              <Switch
                checked={stems[o.key as keyof typeof stems]}
                onCheckedChange={(v) => setStems((p) => ({ ...p, [o.key]: v }))}
              />
            </div>
          ))}
        </div>
        <ProcessingPanel {...splitter} onDownload={splitter.download} onReset={splitter.reset} />
      </ToolCard>

      <ToolCard title="Chord Progression" description="פרוגרסיות לפי מצב רוח" icon={<Sparkles className="h-5 w-5" />}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">מצב רוח</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="happy">שמח</SelectItem>
                <SelectItem value="sad">עצוב</SelectItem>
                <SelectItem value="epic">אפי</SelectItem>
                <SelectItem value="chill">רגוע</SelectItem>
                <SelectItem value="tense">מתוח</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">סולם</Label>
            <Select defaultValue="c-major">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="c-major">דו מז'ור</SelectItem>
                <SelectItem value="a-minor">לה מינור</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(progGen.result?.data?.["אקורדים"] as string | undefined)?.split(" → ").map((c, i) => (
            <div key={i} className="flex h-14 w-14 items-center justify-center rounded-lg border bg-primary/10 font-mono text-sm font-bold text-primary">
              {c}
            </div>
          )) || ["I", "vi", "IV", "V"].map((c) => (
            <div key={c} className="flex h-14 w-14 items-center justify-center rounded-lg border bg-primary/5 font-mono text-lg font-bold text-primary">
              {c}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => progGen.run("יצירת פרוגרסיה", async () => {
            const chords = pick(PROGRESSIONS_BY_MOOD[mood] ?? PROGRESSIONS_BY_MOOD.happy);
            const txt = `Chord Progression\nMood: ${mood}\nChords: ${chords.join(" → ")}\n`;
            return {
              data: { "אקורדים": chords.join(" → "), "מצב": mood },
              download: { bytes: txt, filename: `progression-${mood}.txt`, mime: "text/plain" },
            };
          })}>צור מחדש</Button>
          <Button onClick={progGen.download} disabled={!progGen.result?.download}>
            <Download className="ml-2 h-4 w-4" /> הורד
          </Button>
        </div>
        <ProcessingPanel {...progGen} onDownload={progGen.download} onReset={progGen.reset} />
      </ToolCard>
    </div>
  );
}
