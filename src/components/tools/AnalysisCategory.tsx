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

export function AnalysisCategory() {
  const [stems, setStems] = useState({ vocals: true, drums: false, bass: false, denoise: false });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToolCard title="Smart Analyzer" description="זיהוי אקורדים וסולם" icon={<Brain className="h-5 w-5" />} badge="AI">
        <div className="space-y-2">
          <Label className="text-xs">קישור YouTube</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Youtube className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input dir="ltr" placeholder="https://youtube.com/..." className="pr-8" />
            </div>
            <Button onClick={() => toast.info("בקרוב — ניתוח בזמן אמת")}>נתח</Button>
          </div>
          <div className="text-center text-[11px] text-muted-foreground">— או —</div>
          <Dropzone hint="העלה קובץ אודיו לניתוח" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <div className="text-[10px] text-muted-foreground">סולם זוהה</div>
            <div className="text-lg font-bold tracking-wide">— —</div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-center">
            <div className="text-[10px] text-muted-foreground">BPM</div>
            <div className="text-lg font-bold tracking-wide">— —</div>
          </div>
        </div>
        <div className="mt-2 rounded-lg border bg-muted/40 p-3">
          <div className="text-[10px] text-muted-foreground">רצף אקורדים</div>
          <div className="mt-1 font-mono text-sm tracking-wider text-muted-foreground">Am · F · C · G ...</div>
        </div>
      </ToolCard>

      <ToolCard title="גנרטור תווים" description="המרת אודיו לתווים" icon={<FileMusic className="h-5 w-5" />}>
        <Dropzone hint="העלה אודיו ליצירת תווים" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">סולם</Label>
            <Select defaultValue="auto">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">זיהוי אוטומטי</SelectItem>
                <SelectItem value="c-major">דו מז'ור</SelectItem>
                <SelectItem value="a-minor">לה מינור</SelectItem>
                <SelectItem value="g-major">סול מז'ור</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">כלי</Label>
            <Select defaultValue="piano">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="piano">פסנתר</SelectItem>
                <SelectItem value="guitar">גיטרה</SelectItem>
                <SelectItem value="violin">כינור</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex h-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 text-xs text-muted-foreground">
          תצוגת תווים תופיע כאן
        </div>
        <Button className="mt-3 w-full" variant="outline" onClick={() => toast.info("בקרוב")}>
          <Download className="ml-2 h-4 w-4" /> הורד כ-PDF
        </Button>
      </ToolCard>

      <ToolCard title="Stem Splitter & Denoise" description="הפרדת ערוצים והפחתת רעש" icon={<Layers className="h-5 w-5" />} badge="AI">
        <Dropzone hint="העלה אודיו לפיצול" />
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
        <Button className="mt-3 w-full" onClick={() => toast.info("בקרוב")}>הפעל עיבוד</Button>
      </ToolCard>

      <ToolCard title="AI Chord Progression" description="יצירת פרוגרסיית אקורדים" icon={<Sparkles className="h-5 w-5" />} badge="AI">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">מצב רוח</Label>
            <Select defaultValue="happy">
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
                <SelectItem value="d-dorian">רה דוריאן</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["I", "vi", "IV", "V"].map((c) => (
            <div key={c} className="flex h-14 w-14 items-center justify-center rounded-lg border bg-primary/5 font-mono text-lg font-bold text-primary">
              {c}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => toast.info("בקרוב")}>צור מחדש</Button>
          <Button onClick={() => toast.info("בקרוב")}>
            <Download className="ml-2 h-4 w-4" /> הורד MIDI
          </Button>
        </div>
      </ToolCard>
    </div>
  );
}
