import { useState } from "react";
import { ToolCard } from "./ToolCard";
import { Dropzone } from "./Dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scissors, Volume2, Music, Tags, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useProcessingTask } from "./useProcessingTask";
import { ProcessingPanel } from "./ProcessingPanel";

const dummy = (name: string) => ({ bytes: `Generated: ${name}\n${new Date().toISOString()}`, filename: name, mime: "application/octet-stream" });

export function StudioCategory() {
  const [pitch, setPitch] = useState([0]);
  const slicer = useProcessingTask();
  const normalizer = useProcessingTask();
  const pitchShift = useProcessingTask();
  const id3 = useProcessingTask();

  const handle = (cb: (f: File) => void) => (files: File[]) => {
    if (files[0]) { toast.success("הקובץ הועלה בהצלחה"); cb(files[0]); }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToolCard title="Bulk Slicer" description="חיתוך אודיו אוטומטי" icon={<Scissors className="h-5 w-5" />}>
        <Dropzone hint="קובץ אודיו ארוך לחיתוך" onFiles={handle((f) => {
          slicer.run("חיתוך", () => ({
            data: { "פלחים": Math.floor(Math.random() * 20) + 8, "פורמט": "WAV" },
            download: dummy(`${f.name.replace(/\.[^.]+$/, "")}-slices.zip`),
          }), 3500);
        })} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">שיטה</Label>
            <Select defaultValue="time">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="time">לפי זמן קבוע</SelectItem>
                <SelectItem value="transient">לפי טרנזיינטים</SelectItem>
                <SelectItem value="silence">לפי שתיקה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">משך פלח (שניות)</Label>
            <Input type="number" defaultValue={4} min={0.1} step={0.1} className="h-9" />
          </div>
        </div>
        <ProcessingPanel {...slicer} onDownload={slicer.download} onReset={slicer.reset} />
      </ToolCard>

      <ToolCard title="Batch Normalizer" description="נירמול עוצמה לכמה קבצים" icon={<Volume2 className="h-5 w-5" />}>
        <Dropzone multiple hint="גרור מספר קבצים לנירמול אצווה" onFiles={(files) => {
          if (files.length === 0) return;
          toast.success(`${files.length} קבצים הועלו בהצלחה`);
          normalizer.run("נירמול", () => ({
            data: { "קבצים": files.length, "יעד": "-14 LUFS" },
            download: dummy("normalized-batch.zip"),
          }), 4000);
        }} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">יעד</Label>
            <Select defaultValue="lufs">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lufs">LUFS</SelectItem>
                <SelectItem value="peak">Peak (dBFS)</SelectItem>
                <SelectItem value="rms">RMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">ערך יעד</Label>
            <Input type="number" defaultValue={-14} className="h-9" dir="ltr" />
          </div>
        </div>
        <ProcessingPanel {...normalizer} onDownload={normalizer.download} onReset={normalizer.reset} />
      </ToolCard>

      <ToolCard title="Pitch Shifter" description="שינוי גובה ללא שינוי טמפו" icon={<Music className="h-5 w-5" />}>
        <Dropzone hint="קובץ אודיו לשינוי גובה" onFiles={handle((f) => {
          pitchShift.run("Pitch Shift", () => ({
            data: { "סטייה": `${pitch[0] > 0 ? "+" : ""}${pitch[0]} חצאי טון` },
            download: dummy(`${f.name.replace(/\.[^.]+$/, "")}-pitched.wav`),
          }), 3000);
        })} />
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs">חצאי-טונים</Label>
            <span className="font-mono text-sm font-bold text-primary">
              {pitch[0] > 0 ? "+" : ""}{pitch[0]}
            </span>
          </div>
          <Slider value={pitch} onValueChange={setPitch} min={-12} max={12} step={1} />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>-12</span><span>0</span><span>+12</span>
          </div>
        </div>
        <ProcessingPanel {...pitchShift} onDownload={pitchShift.download} onReset={pitchShift.reset} />
      </ToolCard>

      <ToolCard title="עורך ID3 מתקדם" description="הטמעת תמונות ומטא-דאטה" icon={<Tags className="h-5 w-5" />}>
        <Dropzone accept="audio/mpeg,.mp3" hint="קובץ MP3 לעריכה" onFiles={handle((f) => {
          id3.run("שמירת מטא-דאטה", () => ({
            data: { "קובץ": f.name, "תגיות": "ID3v2.4" },
            download: dummy(f.name),
          }), 2000);
        })} />
        <div className="mt-3 grid grid-cols-[80px,1fr] gap-3">
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary/50">
            <ImageIcon className="h-5 w-5" />
            <span className="text-[10px]">עטיפה</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              if (e.target.files?.[0]) toast.success("עטיפה הוטענה");
            }} />
          </label>
          <div className="space-y-2">
            <Input placeholder="שם האמן" className="h-8" />
            <Input placeholder="שם השיר / אלבום" className="h-8" />
            <Input placeholder="זכויות יוצרים © 2026" className="h-8" />
          </div>
        </div>
        <ProcessingPanel {...id3} onDownload={id3.download} onReset={id3.reset} />
      </ToolCard>
    </div>
  );
}
