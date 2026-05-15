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

export function StudioCategory() {
  const [pitch, setPitch] = useState([0]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToolCard title="Bulk Slicer" description="חיתוך אודיו אוטומטי" icon={<Scissors className="h-5 w-5" />}>
        <Dropzone hint="קובץ אודיו ארוך לחיתוך" />
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
        <Button className="mt-3 w-full" onClick={() => toast.info("בקרוב")}>חתוך וייצא ZIP</Button>
      </ToolCard>

      <ToolCard title="Batch Normalizer" description="נירמול עוצמה לכמה קבצים" icon={<Volume2 className="h-5 w-5" />}>
        <Dropzone multiple hint="גרור מספר קבצים לנירמול אצווה" />
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
        <Button className="mt-3 w-full" onClick={() => toast.info("בקרוב")}>נרמל הכל</Button>
      </ToolCard>

      <ToolCard title="Pitch Shifter" description="שינוי גובה ללא שינוי טמפו" icon={<Music className="h-5 w-5" />}>
        <Dropzone hint="קובץ אודיו לשינוי גובה" />
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
        <Button className="mt-3 w-full" onClick={() => toast.info("בקרוב")}>החל ושמור</Button>
      </ToolCard>

      <ToolCard title="עורך ID3 מתקדם" description="הטמעת תמונות ומטא-דאטה" icon={<Tags className="h-5 w-5" />}>
        <Dropzone accept="audio/mpeg,.mp3" hint="קובץ MP3 לעריכה" />
        <div className="mt-3 grid grid-cols-[80px,1fr] gap-3">
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary/50">
            <ImageIcon className="h-5 w-5" />
            <span className="text-[10px]">עטיפה</span>
            <input type="file" accept="image/*" className="hidden" />
          </label>
          <div className="space-y-2">
            <Input placeholder="שם האמן" className="h-8" />
            <Input placeholder="שם השיר / אלבום" className="h-8" />
            <Input placeholder="זכויות יוצרים © 2026" className="h-8" />
          </div>
        </div>
        <Button className="mt-3 w-full" onClick={() => toast.info("בקרוב")}>שמור מטא-דאטה</Button>
      </ToolCard>
    </div>
  );
}
