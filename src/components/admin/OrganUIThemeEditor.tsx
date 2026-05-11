import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { OrganScreenPreview } from "./organ-editor/OrganScreenPreview";
import { ThemeImageField } from "./organ-editor/ThemeImageField";
import {
  DEFAULT_TYROS_THEME, mergeTheme, type OrganButton, type OrganTheme,
} from "@/lib/organTheme";
import { clearOrganThemeCache } from "@/hooks/useOrganTheme";

type Model = { id: string; model_name: string; brand_id: string };

/* ---------- small reusable controls ---------- */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // Extract first color from gradient for color picker; fallback white
  const isGradient = /gradient/i.test(value);
  const firstColor = (value.match(/#([0-9a-f]{3,8})/i)?.[0]) ?? "#ffffff";
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={firstColor}
          onChange={(e) => {
            if (isGradient) onChange(value.replace(/#([0-9a-f]{3,8})/i, e.target.value));
            else onChange(e.target.value);
          }}
          className="h-9 w-10 rounded border bg-background cursor-pointer shrink-0"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, min = 0, max = 100, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
        <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-20" />
      </div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SwitchField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded border p-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

/* ---------- main editor ---------- */
export function OrganUIThemeEditor({ initialModelId }: { initialModelId?: string } = {}) {
  const [models, setModels] = useState<Model[]>([]);
  const [modelId, setModelId] = useState<string | null>(initialModelId ?? null);
  const [theme, setTheme] = useState<OrganTheme>(DEFAULT_TYROS_THEME);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("keyboard_models")
        .select("id, model_name, brand_id")
        .order("model_name");
      setModels((data ?? []) as Model[]);
      if (data && data.length && !modelId) setModelId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!modelId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("organ_ui_themes" as any)
        .select("theme")
        .eq("model_id", modelId)
        .maybeSingle();
      setTheme(mergeTheme(DEFAULT_TYROS_THEME, (data as any)?.theme ?? null));
      setLoading(false);
    })();
  }, [modelId]);

  const save = async () => {
    if (!modelId) return;
    setSaving(true);
    const { error } = await supabase
      .from("organ_ui_themes" as any)
      .upsert({ model_id: modelId, theme: theme as any }, { onConflict: "model_id" });
    setSaving(false);
    if (error) { toast.error("שמירה נכשלה: " + error.message); return; }
    clearOrganThemeCache(modelId);
    toast.success("העיצוב נשמר");
  };

  const reset = () => {
    if (!confirm("לאפס לעיצוב ברירת מחדל?")) return;
    setTheme(DEFAULT_TYROS_THEME);
  };

  // helpers to update nested theme
  const update = <K extends keyof OrganTheme>(key: K, value: Partial<OrganTheme[K]>) =>
    setTheme((t) => ({ ...t, [key]: { ...(t[key] as any), ...value } }));

  const updateBtn = (id: string, patch: Partial<OrganButton>) =>
    setTheme((t) => ({ ...t, buttons: { ...t.buttons, list: t.buttons.list.map((b) => b.id === id ? { ...b, ...patch } : b) } }));

  const removeBtn = (id: string) =>
    setTheme((t) => ({ ...t, buttons: { ...t.buttons, list: t.buttons.list.filter((b) => b.id !== id) } }));

  const addBtn = () => {
    const id = `b_${Date.now()}`;
    setTheme((t) => ({
      ...t,
      buttons: {
        ...t.buttons,
        list: [...t.buttons.list, { id, code: id.toUpperCase(), label: "NEW BTN", group: "EXTRA", led: "blue" }],
      },
    }));
  };

  const selectedModelName = useMemo(() => models.find((m) => m.id === modelId)?.model_name ?? "—", [models, modelId]);

  return (
    <div dir="rtl" className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>עיצוב מסכי אורגנים</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              ערוך כל אלמנט במסך הוויזואלי של האורגן — באנר עליון/תחתון, מסך LCD, כפתורים פיזיים, גוף האורגן וכלי עריכה. השינויים נשמרים פר-דגם.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={modelId ?? ""} onValueChange={(v) => setModelId(v)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="בחר דגם" /></SelectTrigger>
              <SelectContent>
                {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.model_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="ml-1 h-4 w-4" />איפוס</Button>
            <Button size="sm" onClick={save} disabled={saving || !modelId}>
              {saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}
              שמור
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_440px]">
        {/* PREVIEW */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">תצוגה מקדימה — {selectedModelName}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <OrganScreenPreview theme={theme} />
            )}
          </CardContent>
        </Card>

        {/* EDITOR */}
        <Card>
          <CardContent className="p-3">
            <Tabs defaultValue="top" dir="rtl">
              <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto">
                <TabsTrigger value="top" className="text-xs">עליון</TabsTrigger>
                <TabsTrigger value="lcd" className="text-xs">מסך</TabsTrigger>
                <TabsTrigger value="bottom" className="text-xs">תחתון</TabsTrigger>
                <TabsTrigger value="toolbar" className="text-xs">כלים</TabsTrigger>
                <TabsTrigger value="chassis" className="text-xs">גוף</TabsTrigger>
                <TabsTrigger value="buttons" className="text-xs">כפתורים</TabsTrigger>
              </TabsList>

              {/* TOP BANNER */}
              <TabsContent value="top" className="space-y-3 pt-3">
                <TextField label="טקסט מותג (YAMAHA…)" value={theme.brandText} onChange={(v) => setTheme((t) => ({ ...t, brandText: v }))} />
                <TextField label="תווית מסך (STYLE/VOICE…)" value={theme.screenLabel} onChange={(v) => setTheme((t) => ({ ...t, screenLabel: v }))} />
                <ColorField label="רקע באנר עליון" value={theme.topBanner.bg} onChange={(v) => update("topBanner", { bg: v })} />
                <ColorField label="צבע טקסט" value={theme.topBanner.textColor} onChange={(v) => update("topBanner", { textColor: v })} />
                <NumberField label="גובה (px)" value={theme.topBanner.height} onChange={(v) => update("topBanner", { height: v })} min={20} max={80} />
                <SwitchField label="הצג לוגו" value={theme.topBanner.showLogo} onChange={(v) => update("topBanner", { showLogo: v })} />

                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs font-semibold">טאבים (PRESET / USER / HD1 …)</Label>
                  {theme.tabs.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={t.label} onChange={(e) => {
                        const next = [...theme.tabs]; next[i] = { ...next[i], label: e.target.value };
                        setTheme((s) => ({ ...s, tabs: next }));
                      }} />
                      <Button variant="ghost" size="icon" onClick={() => setTheme((s) => ({ ...s, tabs: s.tabs.filter((_, idx) => idx !== i) }))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setTheme((s) => ({ ...s, tabs: [...s.tabs, { label: "NEW" }] }))}>
                    <Plus className="ml-1 h-3 w-3" />טאב חדש
                  </Button>
                  <ColorField label="רקע סרגל טאבים" value={theme.tabsBar.bg} onChange={(v) => update("tabsBar", { bg: v })} />
                  <ColorField label="רקע טאב פעיל" value={theme.tabsBar.activeBg} onChange={(v) => update("tabsBar", { activeBg: v })} />
                  <ColorField label="טקסט טאב" value={theme.tabsBar.textColor} onChange={(v) => update("tabsBar", { textColor: v })} />
                  <ColorField label="טקסט פעיל" value={theme.tabsBar.activeTextColor} onChange={(v) => update("tabsBar", { activeTextColor: v })} />
                </div>
              </TabsContent>

              {/* LCD */}
              <TabsContent value="lcd" className="space-y-3 pt-3">
                <ColorField label="רקע מסך LCD" value={theme.lcd.bg} onChange={(v) => update("lcd", { bg: v })} />
                <ColorField label="צבע טקסט" value={theme.lcd.textColor} onChange={(v) => update("lcd", { textColor: v })} />
                <ColorField label="רקע כרטיס פריט" value={theme.lcd.cardBg} onChange={(v) => update("lcd", { cardBg: v })} />
                <ColorField label="טקסט כרטיס" value={theme.lcd.cardTextColor} onChange={(v) => update("lcd", { cardTextColor: v })} />
                <ColorField label="צבע הדגשה (פעיל)" value={theme.lcd.accentColor} onChange={(v) => update("lcd", { accentColor: v })} />
              </TabsContent>

              {/* BOTTOM */}
              <TabsContent value="bottom" className="space-y-3 pt-3">
                <ColorField label="רקע באנר תחתון" value={theme.bottomBanner.bg} onChange={(v) => update("bottomBanner", { bg: v })} />
                <ColorField label="צבע טקסט" value={theme.bottomBanner.textColor} onChange={(v) => update("bottomBanner", { textColor: v })} />
                <ColorField label="רקע P1/P2" value={theme.bottomBanner.pButton.bg} onChange={(v) => update("bottomBanner", { pButton: { ...theme.bottomBanner.pButton, bg: v } })} />
                <ColorField label="P1/P2 פעיל" value={theme.bottomBanner.pButton.activeColor} onChange={(v) => update("bottomBanner", { pButton: { ...theme.bottomBanner.pButton, activeColor: v } })} />
                <ColorField label="רקע כפתור UP" value={theme.bottomBanner.upButton.bg} onChange={(v) => update("bottomBanner", { upButton: { ...theme.bottomBanner.upButton, bg: v } })} />
                <ColorField label="טקסט UP" value={theme.bottomBanner.upButton.textColor} onChange={(v) => update("bottomBanner", { upButton: { ...theme.bottomBanner.upButton, textColor: v } })} />
                <SwitchField label="הצג כפתור UP" value={theme.bottomBanner.upButton.show} onChange={(v) => update("bottomBanner", { upButton: { ...theme.bottomBanner.upButton, show: v } })} />
              </TabsContent>

              {/* TOOLBAR */}
              <TabsContent value="toolbar" className="space-y-3 pt-3">
                <SwitchField label="הצג סרגל כלים" value={theme.toolbar.show} onChange={(v) => update("toolbar", { show: v })} />
                <ColorField label="רקע סרגל" value={theme.toolbar.bg} onChange={(v) => update("toolbar", { bg: v })} />
                <ColorField label="רקע כלי" value={theme.toolbar.itemBg} onChange={(v) => update("toolbar", { itemBg: v })} />
                <ColorField label="טקסט" value={theme.toolbar.textColor} onChange={(v) => update("toolbar", { textColor: v })} />
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">פריטי כלים</Label>
                  {theme.toolbar.items.map((it, i) => (
                    <div key={it.id} className="flex gap-2">
                      <Input value={it.label} onChange={(e) => {
                        const next = [...theme.toolbar.items]; next[i] = { ...it, label: e.target.value };
                        update("toolbar", { items: next });
                      }} />
                      <Input value={it.icon ?? ""} placeholder="icon" onChange={(e) => {
                        const next = [...theme.toolbar.items]; next[i] = { ...it, icon: e.target.value };
                        update("toolbar", { items: next });
                      }} className="w-28" />
                      <Button variant="ghost" size="icon" onClick={() => update("toolbar", { items: theme.toolbar.items.filter((_, idx) => idx !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => update("toolbar", { items: [...theme.toolbar.items, { id: `t_${Date.now()}`, label: "NEW", icon: "FileText" }] })}>
                    <Plus className="ml-1 h-3 w-3" />כלי חדש
                  </Button>
                  <p className="text-[10px] text-muted-foreground">אייקונים זמינים: FileText, Scissors, Copy, ClipboardPaste, Trash2, Save, FolderOpen, MenuSquare</p>
                </div>
              </TabsContent>

              {/* CHASSIS */}
              <TabsContent value="chassis" className="space-y-3 pt-3">
                <ColorField label="רקע גוף האורגן" value={theme.chassis.bg} onChange={(v) => update("chassis", { bg: v })} />
                <NumberField label="עיגול פינות (px)" value={theme.chassis.borderRadius} onChange={(v) => update("chassis", { borderRadius: v })} min={0} max={40} />
                <SwitchField label="הצג ברגים" value={theme.chassis.showScrews} onChange={(v) => update("chassis", { showScrews: v })} />
              </TabsContent>

              {/* BUTTONS */}
              <TabsContent value="buttons" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <ColorField label="רקע כפתור" value={theme.buttons.bg} onChange={(v) => update("buttons", { bg: v })} />
                  <ColorField label="טקסט" value={theme.buttons.textColor} onChange={(v) => update("buttons", { textColor: v })} />
                  <ColorField label="LED כחול" value={theme.buttons.ledBlue} onChange={(v) => update("buttons", { ledBlue: v })} />
                  <ColorField label="LED ירוק" value={theme.buttons.ledGreen} onChange={(v) => update("buttons", { ledGreen: v })} />
                  <ColorField label="LED ענבר" value={theme.buttons.ledAmber} onChange={(v) => update("buttons", { ledAmber: v })} />
                  <ColorField label="LED אדום" value={theme.buttons.ledRed} onChange={(v) => update("buttons", { ledRed: v })} />
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">רשימת כפתורים פיזיים ({theme.buttons.list.length})</Label>
                    <Button size="sm" variant="outline" onClick={addBtn}><Plus className="ml-1 h-3 w-3" />כפתור</Button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                    {theme.buttons.list.map((b) => (
                      <div key={b.id} className="grid grid-cols-[1fr_1fr_90px_90px_auto] gap-1 items-center text-xs">
                        <Input value={b.label} onChange={(e) => updateBtn(b.id, { label: e.target.value })} placeholder="תווית" />
                        <Input value={b.code} onChange={(e) => updateBtn(b.id, { code: e.target.value })} placeholder="code" className="font-mono" />
                        <Select value={b.group} onValueChange={(v) => updateBtn(b.id, { group: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["INTRO", "MAIN", "FILL", "ENDING", "EXTRA"] as const).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={b.led} onValueChange={(v) => updateBtn(b.id, { led: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["blue", "green", "amber", "red"] as const).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => removeBtn(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
