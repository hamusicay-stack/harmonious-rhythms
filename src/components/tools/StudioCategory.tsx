import { useRef, useState } from "react";
import { ToolCard } from "./ToolCard";
import { Dropzone } from "./Dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scissors, Volume2, Music, Tags, Image as ImageIcon, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { useProcessingTask } from "./useProcessingTask";
import { ProcessingPanel } from "./ProcessingPanel";
import { decodeAudioFile, encodeWAV, normalizeToPeak, pitchShift, formatBytes } from "@/lib/audioTools";

export function StudioCategory() {
  const [pitch, setPitch] = useState([0]);
  const [normTarget, setNormTarget] = useState(-0.3);
  const slicer = useProcessingTask();
  const normalizer = useProcessingTask();
  const pitchTask = useProcessingTask();
  const id3 = useProcessingTask();

  // ID3 form state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [copyright, setCopyright] = useState("");

  // Pitch preview
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handle = (cb: (f: File) => void) => (files: File[]) => {
    if (files[0]) { toast.success("הקובץ הועלה בהצלחה"); cb(files[0]); }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToolCard title="Bulk Slicer" description="חיתוך אודיו לפלחים שווים" icon={<Scissors className="h-5 w-5" />}>
        <Dropzone hint="קובץ אודיו ארוך לחיתוך" onFiles={handle((f) => {
          slicer.run("חיתוך", async () => {
            const buf = await decodeAudioFile(f);
            const sliceSec = 4;
            const sliceLen = Math.floor(buf.sampleRate * sliceSec);
            const count = Math.ceil(buf.length / sliceLen);
            // Produce a single concatenated WAV that includes 200ms silence between slices
            const gap = Math.floor(buf.sampleRate * 0.2);
            const totalLen = buf.length + gap * (count - 1);
            const out = new AudioBuffer({ numberOfChannels: buf.numberOfChannels, length: totalLen, sampleRate: buf.sampleRate });
            for (let c = 0; c < buf.numberOfChannels; c++) {
              const src = buf.getChannelData(c);
              const dst = out.getChannelData(c);
              let writePos = 0;
              for (let i = 0; i < count; i++) {
                const start = i * sliceLen;
                const end = Math.min(start + sliceLen, buf.length);
                dst.set(src.subarray(start, end), writePos);
                writePos += end - start + gap;
              }
            }
            const blob = encodeWAV(out);
            return {
              data: { "פלחים": count, "משך פלח": `${sliceSec}s`, "גודל": formatBytes(blob.size) },
              download: { bytes: blob, filename: `${f.name.replace(/\.[^.]+$/, "")}-sliced.wav`, mime: "audio/wav" },
            };
          });
        })} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">שיטה</Label>
            <Select defaultValue="time">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="time">לפי זמן קבוע (4s)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">פורמט פלט</Label>
            <Input value="WAV" disabled className="h-9" />
          </div>
        </div>
        <ProcessingPanel {...slicer} onDownload={slicer.download} onReset={slicer.reset} />
      </ToolCard>

      <ToolCard title="Normalizer" description="נירמול לעוצמה מירבית בטוחה" icon={<Volume2 className="h-5 w-5" />}>
        <Dropzone hint="קובץ אודיו לנירמול" onFiles={handle((f) => {
          normalizer.run("נירמול", async () => {
            const buf = await decodeAudioFile(f);
            const { buffer: normalized, peakDb, gain } = normalizeToPeak(buf, normTarget);
            const blob = encodeWAV(normalized);
            return {
              data: {
                "פיק מקורי": `${peakDb.toFixed(1)} dBFS`,
                "Gain": `${(20 * Math.log10(gain)).toFixed(1)} dB`,
                "יעד": `${normTarget} dBFS`,
                "גודל": formatBytes(blob.size),
              },
              download: { bytes: blob, filename: `${f.name.replace(/\.[^.]+$/, "")}-normalized.wav`, mime: "audio/wav" },
            };
          });
        })} />
        <div className="mt-3">
          <Label className="text-xs">יעד פיק (dBFS)</Label>
          <Input
            type="number"
            value={normTarget}
            onChange={(e) => setNormTarget(parseFloat(e.target.value) || -0.3)}
            step={0.1}
            max={0}
            className="h-9"
          />
        </div>
        <ProcessingPanel {...normalizer} onDownload={normalizer.download} onReset={normalizer.reset} />
      </ToolCard>

      <ToolCard title="Pitch Shifter" description="שינוי גובה ב-Web Audio (משנה גם טמפו)" icon={<Music className="h-5 w-5" />}>
        <Dropzone hint="קובץ אודיו לשינוי גובה" onFiles={handle((f) => {
          pitchTask.run("Pitch Shift", async () => {
            const buf = await decodeAudioFile(f);
            const shifted = await pitchShift(buf, pitch[0]);
            const blob = encodeWAV(shifted);
            const url = URL.createObjectURL(blob);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(url);
            setIsPlaying(false);
            return {
              data: {
                "סטייה": `${pitch[0] > 0 ? "+" : ""}${pitch[0]} חצאי טון`,
                "Sample Rate": `${buf.sampleRate} Hz`,
                "גודל": formatBytes(blob.size),
              },
              download: { bytes: blob, filename: `${f.name.replace(/\.[^.]+$/, "")}-pitched.wav`, mime: "audio/wav" },
            };
          });
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
        {previewUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!audioRef.current) return;
                if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
                else { audioRef.current.play(); setIsPlaying(true); }
              }}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-muted-foreground">תצוגה מקדימה</span>
            <audio
              ref={audioRef}
              src={previewUrl}
              onEnded={() => setIsPlaying(false)}
              className="ms-auto h-8 flex-1"
              controls
            />
          </div>
        )}
        <ProcessingPanel {...pitchTask} onDownload={pitchTask.download} onReset={pitchTask.reset} />
      </ToolCard>

      <ToolCard title="עורך ID3 מתקדם" description="הטמעת תמונות ומטא-דאטה לקובץ MP3" icon={<Tags className="h-5 w-5" />}>
        <Dropzone accept="audio/mpeg,.mp3" hint="קובץ MP3 לעריכה" onFiles={handle((f) => {
          id3.run("שמירת מטא-דאטה", async () => {
            const { ID3Writer } = await import("browser-id3-writer");
            const ab = await f.arrayBuffer();
            const writer = new ID3Writer(ab);
            if (artist) writer.setFrame("TPE1", [artist]);
            if (title) writer.setFrame("TIT2", title);
            if (copyright) writer.setFrame("TCOP", copyright);
            if (coverFile) {
              const coverAb = await coverFile.arrayBuffer();
              writer.setFrame("APIC", {
                type: 3,
                data: coverAb,
                description: "Cover",
              });
            }
            writer.addTag();
            const blob = writer.getBlob();
            return {
              data: {
                "אמן": artist || "—",
                "כותרת": title || "—",
                "עטיפה": coverFile ? "✓" : "—",
                "גודל": formatBytes(blob.size),
              },
              download: { bytes: blob, filename: f.name, mime: "audio/mpeg" },
            };
          });
        })} />
        <div className="mt-3 grid grid-cols-[80px,1fr] gap-3">
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary/50">
            {coverFile ? (
              <img src={URL.createObjectURL(coverFile)} alt="cover" className="h-full w-full rounded-md object-cover" />
            ) : (
              <>
                <ImageIcon className="h-5 w-5" />
                <span className="text-[10px]">עטיפה</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setCoverFile(e.target.files[0]);
                  toast.success("עטיפה הוטענה");
                }
              }}
            />
          </label>
          <div className="space-y-2">
            <Input placeholder="שם האמן" value={artist} onChange={(e) => setArtist(e.target.value)} className="h-8" />
            <Input placeholder="שם השיר / אלבום" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
            <Input placeholder="זכויות יוצרים © 2026" value={copyright} onChange={(e) => setCopyright(e.target.value)} className="h-8" />
          </div>
        </div>
        <ProcessingPanel {...id3} onDownload={id3.download} onReset={id3.reset} />
      </ToolCard>
    </div>
  );
}
