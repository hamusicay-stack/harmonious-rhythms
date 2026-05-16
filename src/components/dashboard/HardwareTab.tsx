import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Piano, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Brand = { id: string; name: string; logo_url: string | null };
type KeyboardModel = {
  id: string;
  brand_id: string;
  model_name: string;
  ui_image_url: string | null;
  brand?: Brand | null;
};

interface Props {
  userId: string;
}

export function HardwareTab({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<KeyboardModel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string>("all");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [mRes, bRes, pRes] = await Promise.all([
        (supabase as any).from("keyboard_models").select("*, brand:brands(*)").order("model_name"),
        (supabase as any).from("brands").select("*").order("name"),
        (supabase as any).from("profiles").select("keyboard_model_id").eq("id", userId).maybeSingle(),
      ]);
      if (!active) return;
      setModels(((mRes.data ?? []) as unknown) as KeyboardModel[]);
      setBrands(((bRes.data ?? []) as unknown) as Brand[]);
      const cur = (pRes.data as any)?.keyboard_model_id ?? null;
      setCurrentId(cur);
      setPickedId(cur);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const filtered = useMemo(
    () => (activeBrand === "all" ? models : models.filter((m) => m.brand_id === activeBrand)),
    [models, activeBrand],
  );

  const dirty = pickedId !== currentId;

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ keyboard_model_id: pickedId })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentId(pickedId);
    toast.success("דגם הקליד נשמר בהצלחה");
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card-elevated p-5 shadow-elegant">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
            <Piano className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">החומרה שלי</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              הגדר את דגם האורגן שלך כדי שנוכל להתאים לך מקצבים ותוכן בצורה אוטומטית.
            </p>
          </div>
          {currentId && (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3.5 w-3.5" />
              מוגדר
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Brand filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveBrand("all")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                activeBrand === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              הכל
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBrand(b.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  activeBrand === b.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              <Piano className="mx-auto mb-2 h-8 w-8 opacity-50" />
              לא נמצאו דגמים תחת הסינון הזה.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => {
                const isPicked = pickedId === m.id;
                const isCurrent = currentId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPickedId(m.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-card-elevated p-4 text-start shadow-sm transition-all",
                      isPicked
                        ? "border-amber-500/60 ring-2 ring-amber-500/30"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800">
                      {m.ui_image_url ? (
                        <img
                          src={m.ui_image_url}
                          alt={m.model_name}
                          className="max-h-28 max-w-[85%] object-contain"
                        />
                      ) : (
                        <Piano className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs uppercase tracking-wider text-muted-foreground">
                          {m.brand?.name ?? "—"}
                        </div>
                        <div className="truncate text-sm font-semibold">{m.model_name}</div>
                      </div>
                      {isCurrent && (
                        <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-400">
                          <Check className="h-3 w-3" />
                          נוכחי
                        </Badge>
                      )}
                    </div>
                    {isPicked && !isCurrent && (
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-zinc-950">
                        <Check className="h-3 w-3" />
                        נבחר
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Save bar */}
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card-elevated/95 p-3 shadow-elegant backdrop-blur">
            <div className="text-xs text-muted-foreground">
              {dirty ? "יש שינויים שלא נשמרו" : "אין שינויים להעדכן"}
            </div>
            <Button onClick={save} disabled={!dirty || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור דגם
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
