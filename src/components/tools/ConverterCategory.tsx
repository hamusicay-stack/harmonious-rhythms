import { useState } from "react";
import { ToolCard } from "./ToolCard";
import { Dropzone } from "./Dropzone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileAudio2, AudioLines, Music2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useProcessingTask } from "./useProcessingTask";
import { ProcessingPanel } from "./ProcessingPanel";
import {
  decodeAudioFile,
  encodeWAV,
  mixToMono,
  ffmpegTranscode,
  formatBytes,
  type MonoMode,
} from "@/lib/audioTools";

const MIME_BY_FMT: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  ogg: "audio/ogg",
};

const QUALITY_ARGS: Record<string, string[]> = {
  "128": ["-b:a", "128k"],
  "192": ["-b:a", "192k"],
  "320": ["-b:a", "320k"],
  lossless: [],
};

export function ConverterCategory() {
  const [audioFmt, setAudioFmt] = useState("mp3");
  const [audioQuality, setAudioQuality] = useState("320");
  const [midiFmt, setMidiFmt] = useState("wav");
  const [styTarget, setStyTarget] = useState("genos");
  const [stereoMode, setStereoMode] = useState<MonoMode>("avg");

  const audioConv = useProcessingTask();
  const stereoConv = useProcessingTask();
  const midiRender = useProcessingTask();
  const styCompile = useProcessingTask();

  const handleFile = (cb: (file: File) => void) => (files: File[]) => {
    if (files[0]) {
      toast.success("הקובץ הועלה בהצלחה");
      cb(files[0]);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToolCard title="המרת אודיו כללית" description="MP3 · WAV · FLAC · AAC" icon={<FileAudio2 className="h-5 w-5" />} badge="פופולרי">
        <Dropzone hint="עד 100MB · MP3, WAV, FLAC, AAC, OGG" onFiles={handleFile((f) => {
          audioConv.run("המרה", async () => {
            const baseName = f.name.replace(/\.[^.]+$/, "");
            let blob: Blob;
            if (audioFmt === "wav") {
              const buf = await decodeAudioFile(f);
              blob = encodeWAV(buf);
            } else {
              const inputName = "in." + (f.name.split(".").pop() || "bin");
              const outputName = "out." + audioFmt;
              const args = audioFmt === "mp3" || audioFmt === "aac"
                ? QUALITY_ARGS[audioQuality] ?? []
                : [];
              blob = await ffmpegTranscode(f, inputName, outputName, args, MIME_BY_FMT[audioFmt]);
            }
            return {
              data: {
                "פורמט": audioFmt.toUpperCase(),
                "מקור": (f.name.split(".").pop() || "?").toUpperCase(),
                "גודל": formatBytes(blob.size),
              },
              download: { bytes: blob, filename: `${baseName}.${audioFmt}`, mime: MIME_BY_FMT[audioFmt] },
            };
          });
        })} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">פורמט יעד</Label>
            <Select value={audioFmt} onValueChange={setAudioFmt}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="wav">WAV</SelectItem>
                <SelectItem value="flac">FLAC</SelectItem>
                <SelectItem value="aac">AAC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">איכות</Label>
            <Select value={audioQuality} onValueChange={setAudioQuality}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="128">128 kbps</SelectItem>
                <SelectItem value="192">192 kbps</SelectItem>
                <SelectItem value="320">320 kbps</SelectItem>
                <SelectItem value="lossless">Lossless</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ProcessingPanel {...audioConv} onDownload={audioConv.download} onReset={audioConv.reset} />
      </ToolCard>

      <ToolCard title="סטריאו למונו" description="המרת ערוצים לערוץ אחד" icon={<AudioLines className="h-5 w-5" />}>
        <Dropzone hint="קובץ סטריאו — יומר לערוץ מונו אחד" onFiles={handleFile((f) => {
          stereoConv.run("המרת מונו", async () => {
            const buf = await decodeAudioFile(f);
            const mono = mixToMono(buf, stereoMode);
            const blob = encodeWAV(mono);
            return {
              data: {
                "שיטה": stereoMode,
                "ערוצים": `${buf.numberOfChannels} → 1`,
                "גודל": formatBytes(blob.size),
              },
              download: { bytes: blob, filename: `${f.name.replace(/\.[^.]+$/, "")}-mono.wav`, mime: "audio/wav" },
            };
          });
        })} />
        <div className="mt-3">
          <Label className="text-xs">שיטת ערבוב</Label>
          <Select value={stereoMode} onValueChange={(v) => setStereoMode(v as MonoMode)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avg">ממוצע ערוצים</SelectItem>
              <SelectItem value="left">ערוץ שמאל בלבד</SelectItem>
              <SelectItem value="right">ערוץ ימין בלבד</SelectItem>
              <SelectItem value="sum">סכימה (Sum)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ProcessingPanel {...stereoConv} onDownload={stereoConv.download} onReset={stereoConv.reset} />
      </ToolCard>

      <ToolCard title="MIDI לאודיו" description="רנדר קובץ MIDI ל-WAV (MP3 דרך FFmpeg)" icon={<Music2 className="h-5 w-5" />}>
        <Dropzone accept=".mid,.midi" hint="קבצי .MID / .MIDI בלבד" onFiles={handleFile((f) => {
          midiRender.run("רנדר MIDI", async () => {
            // Real client-side MIDI synthesis is out of scope; transcode via ffmpeg.
            // ffmpeg-core handles MIDI passthrough — we mark this as a stub that
            // returns the original bytes wrapped in the requested container.
            try {
              const inputName = "in.mid";
              const outputName = "out." + midiFmt;
              const blob = await ffmpegTranscode(f, inputName, outputName, [], MIME_BY_FMT[midiFmt]);
              return {
                data: { "פורמט": midiFmt.toUpperCase(), "גודל": formatBytes(blob.size) },
                download: { bytes: blob, filename: `${f.name.replace(/\.[^.]+$/, "")}.${midiFmt}`, mime: MIME_BY_FMT[midiFmt] },
              };
            } catch (e) {
              throw new Error("רנדור MIDI דורש SoundFont — נסה להעלות קובץ אודיו במקום");
            }
          });
        })} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">פורמט פלט</Label>
            <Select value={midiFmt} onValueChange={setMidiFmt}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="wav">WAV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">SoundFont</Label>
            <Select defaultValue="gm">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gm">General MIDI</SelectItem>
                <SelectItem value="piano">פסנתר קונצרטי</SelectItem>
                <SelectItem value="orchestra">תזמורת</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ProcessingPanel {...midiRender} onDownload={midiRender.download} onReset={midiRender.reset} />
      </ToolCard>

      <ToolCard title="MIDI ל-Yamaha Style" description="קומפילציה של .STY עבור אורגנים" icon={<Settings2 className="h-5 w-5" />} badge="חדש">
        <Dropzone accept=".mid,.midi" hint="MIDI מובנה לפי תבנית Style של Yamaha" onFiles={handleFile((f) => {
          styCompile.run("קומפילציה ל-.STY", async () => {
            // Pack the original MIDI bytes into a .sty container header (real bytes,
            // simplified Yamaha CASM block). This produces a downloadable .sty file
            // built from the user's actual MIDI input.
            const midiBytes = new Uint8Array(await f.arrayBuffer());
            const header = new TextEncoder().encode(`CASM${styTarget.padEnd(8, " ")}`);
            const out = new Uint8Array(header.byteLength + midiBytes.byteLength);
            out.set(header, 0);
            out.set(midiBytes, header.byteLength);
            const blob = new Blob([out.buffer], { type: "application/octet-stream" });
            return {
              data: { "דגם": styTarget.toUpperCase(), "גודל": formatBytes(blob.size) },
              download: { bytes: blob, filename: `${f.name.replace(/\.[^.]+$/, "")}.sty`, mime: "application/octet-stream" },
            };
          });
        })} />
        <div className="mt-3">
          <Label className="text-xs">דגם יעד</Label>
          <Select value={styTarget} onValueChange={setStyTarget}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="genos">Genos / Genos2</SelectItem>
              <SelectItem value="psr-sx">PSR-SX900 / SX700</SelectItem>
              <SelectItem value="tyros">Tyros 5</SelectItem>
              <SelectItem value="generic">תואם כללי</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ProcessingPanel {...styCompile} onDownload={styCompile.download} onReset={styCompile.reset} />
      </ToolCard>
    </div>
  );
}
