import { useState } from "react";
import { ToolCard } from "./ToolCard";
import { Dropzone } from "./Dropzone";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileAudio2, AudioLines, Music2, Settings2, Wand2 } from "lucide-react";
import { toast } from "sonner";

function PlaceholderRun({ label = "המר עכשיו" }: { label?: string }) {
  return (
    <Button
      className="w-full"
      onClick={() => toast.info("הכלי בבנייה — ההמרה תופעל בקרוב")}
    >
      <Wand2 className="ml-2 h-4 w-4" /> {label}
    </Button>
  );
}

export function ConverterCategory() {
  const [audioFmt, setAudioFmt] = useState("mp3");
  const [midiFmt, setMidiFmt] = useState("mp3");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToolCard
        title="המרת אודיו כללית"
        description="MP3 · WAV · FLAC · AAC"
        icon={<FileAudio2 className="h-5 w-5" />}
        badge="פופולרי"
      >
        <Dropzone hint="עד 100MB · MP3, WAV, FLAC, AAC, OGG" />
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
            <Select defaultValue="320">
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
        <div className="mt-3"><PlaceholderRun /></div>
      </ToolCard>

      <ToolCard
        title="סטריאו למונו"
        description="המרת ערוצים לערוץ אחד"
        icon={<AudioLines className="h-5 w-5" />}
      >
        <Dropzone hint="קובץ סטריאו — יומר לערוץ מונו אחד" />
        <div className="mt-3">
          <Label className="text-xs">שיטת ערבוב</Label>
          <Select defaultValue="avg">
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avg">ממוצע ערוצים</SelectItem>
              <SelectItem value="left">ערוץ שמאל בלבד</SelectItem>
              <SelectItem value="right">ערוץ ימין בלבד</SelectItem>
              <SelectItem value="sum">סכימה (Sum)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3"><PlaceholderRun /></div>
      </ToolCard>

      <ToolCard
        title="MIDI לאודיו"
        description="רנדר קובץ MIDI ל-MP3 או WAV"
        icon={<Music2 className="h-5 w-5" />}
      >
        <Dropzone accept=".mid,.midi" hint="קבצי .MID / .MIDI בלבד" />
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
        <div className="mt-3"><PlaceholderRun label="רנדר עכשיו" /></div>
      </ToolCard>

      <ToolCard
        title="MIDI ל-Yamaha Style"
        description="קומפילציה של .STY עבור אורגנים"
        icon={<Settings2 className="h-5 w-5" />}
        badge="חדש"
      >
        <Dropzone accept=".mid,.midi" hint="MIDI מובנה לפי תבנית Style של Yamaha" />
        <div className="mt-3">
          <Label className="text-xs">דגם יעד</Label>
          <Select defaultValue="genos">
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="genos">Genos / Genos2</SelectItem>
              <SelectItem value="psr-sx">PSR-SX900 / SX700</SelectItem>
              <SelectItem value="tyros">Tyros 5</SelectItem>
              <SelectItem value="generic">תואם כללי</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3"><PlaceholderRun label="קמפל ל-.STY" /></div>
      </ToolCard>
    </div>
  );
}
