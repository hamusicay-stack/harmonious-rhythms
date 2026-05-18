import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConverterCategory } from "@/components/tools/ConverterCategory";
import { AnalysisCategory } from "@/components/tools/AnalysisCategory";
import { StudioCategory } from "@/components/tools/StudioCategory";
import { HardwareCategory } from "@/components/tools/HardwareCategory";
import { Wand2, Brain, SlidersHorizontal, Cpu } from "lucide-react";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "ארגז כלים למוזיקאי — המוזיקאי" },
      { name: "description", content: "ממירי אודיו, ניתוח AI, כלי סטודיו, מחולל SysEx וטיונר דיגיטלי — הכול במקום אחד." },
      { property: "og:title", content: "ארגז כלים למוזיקאי" },
      { property: "og:description", content: "ממירים, AI, סטודיו וחומרה — מערך כלים מקצועי בעברית." },
    ],
  }),
  component: ToolsPage,
});

const TABS = [
  { id: "converter", label: "ממירים", icon: Wand2, desc: "אודיו · MIDI · STY" },
  { id: "analysis", label: "AI וניתוח", icon: Brain, desc: "אקורדים · תווים · Stems" },
  { id: "studio", label: "סטודיו", icon: SlidersHorizontal, desc: "Slicer · Normalizer · ID3" },
  { id: "hardware", label: "חומרה וכיוונון", icon: Cpu, desc: "SysEx · טיונר" },
] as const;

function ToolsPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
            <Wand2 className="h-3.5 w-3.5 text-primary" /> ארגז הכלים של המוזיקאי
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            כל הכלים שמוזיקאי צריך — <span className="text-primary">במקום אחד</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            ממירים, מנתחי AI, כלי סטודיו ומחוללי חומרה. הכול חינם, הכול בעברית, הכול מהדפדפן.
          </p>
        </header>

        <Tabs defaultValue="converter" className="mt-8">
          <TabsList className="mx-auto grid h-auto w-full max-w-3xl grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-4">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex h-auto flex-col items-center gap-1 rounded-xl border bg-card/60 px-3 py-3 backdrop-blur data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-bold">{t.label}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{t.desc}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="converter"><ConverterCategory /></TabsContent>
            <TabsContent value="analysis"><AnalysisCategory /></TabsContent>
            <TabsContent value="studio"><StudioCategory /></TabsContent>
            <TabsContent value="hardware"><HardwareCategory /></TabsContent>
          </div>
        </Tabs>
      </div>
    </SiteLayout>
  );
}
