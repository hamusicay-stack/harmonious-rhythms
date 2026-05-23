import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Prompt = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  prompt: string;
  model: string;
  is_active: boolean;
};

const MODELS = [
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (איכות מקסימלית)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (מאוזן)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (חדש, מהיר)" },
  { value: "openai/gpt-5", label: "GPT-5 (יוקרתי)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (מהיר)" },
];

export function AiPromptsManager() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Prompt>>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ai_prompts").select("*").order("title");
    if (error) toast.error("שגיאה בטעינת פרומפטים");
    setPrompts((data as Prompt[]) ?? []);
    setEdits({});
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = (id: string, p: Partial<Prompt>) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...p } }));

  const save = async (p: Prompt) => {
    const e = edits[p.id] ?? {};
    if (Object.keys(e).length === 0) return;
    setSavingId(p.id);
    const { error } = await supabase.from("ai_prompts").update(e).eq("id", p.id);
    setSavingId(null);
    if (error) return toast.error("שמירה נכשלה");
    toast.success("נשמר ✓");
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">פרומפטים של עוזרי ה-AI</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        הפרומפטים פה נשלחים אל Gemini בכל פעם שמשתמש או מנהל לוחצים על כפתור AI. שינויים ייכנסו לתוקף מיידית.
      </p>

      {prompts.map((p) => {
        const cur = { ...p, ...edits[p.id] } as Prompt;
        const dirty = !!edits[p.id] && Object.keys(edits[p.id]).length > 0;
        return (
          <Card key={p.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold flex items-center gap-2">{p.title}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.key}</code>
                </div>
                {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">פעיל</Label>
                <Switch checked={cur.is_active} onCheckedChange={(v) => patch(p.id, { is_active: v })} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>כותרת</Label>
                <Input value={cur.title} onChange={(e) => patch(p.id, { title: e.target.value })} />
              </div>
              <div>
                <Label>מודל AI</Label>
                <Select value={cur.model} onValueChange={(v) => patch(p.id, { model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>פרומפט המערכת (System Prompt)</Label>
              <Textarea
                rows={14}
                value={cur.prompt}
                onChange={(e) => patch(p.id, { prompt: e.target.value })}
                className="font-mono text-xs leading-relaxed"
                dir="auto"
              />
            </div>

            <div className="flex gap-2 justify-end">
              {dirty && (
                <Button variant="ghost" onClick={() => setEdits((e) => { const n = { ...e }; delete n[p.id]; return n; })}>
                  <RotateCcw className="ms-1 h-4 w-4" /> בטל
                </Button>
              )}
              <Button onClick={() => save(p)} disabled={!dirty || savingId === p.id}>
                {savingId === p.id ? <Loader2 className="ms-1 h-4 w-4 animate-spin" /> : <Save className="ms-1 h-4 w-4" />}
                שמור פרומפט
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
