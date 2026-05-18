import { useState } from "react";
import { Loader2, Sparkles, BookOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Category = "instruments" | "audio_tech" | "artists" | "music_theory";

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: "instruments", label: "🎹 כלי נגינה וחומרה" },
  { value: "audio_tech", label: "🎛️ טכנולוגיית סאונד והפקה" },
  { value: "artists", label: "👤 אמנים ויוצרים" },
  { value: "music_theory", label: "🎼 תיאוריית המוזיקה" },
];

export function WikiGenerator() {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<Category>("instruments");
  const [loading, setLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ slug: string; title: string } | null>(null);

  const handleGenerate = async () => {
    const t = term.trim();
    if (t.length < 2) {
      toast.error("נא להזין מושג תקין");
      return;
    }
    setLoading(true);
    setLastCreated(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-wiki-page", {
        body: { term: t, category },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "שגיאה לא ידועה");
      toast.success(`✅ נוצר ערך חדש: ${data.article.title}`);
      setLastCreated({ slug: data.article.slug, title: data.article.title });
      setTerm("");
    } catch (e: any) {
      console.error("[WikiGenerator] invoke error:", e, { name: e?.name, message: e?.message, context: e?.context });
      const msg = e?.context?.error ?? e?.message ?? String(e);
      toast.error(`שגיאה ביצירת הערך: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card className="border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BookOpen className="h-6 w-6 text-amber-400" />
            ויזיקאי — מחולל ערכים AI
          </CardTitle>
          <CardDescription>
            הזן מושג מוזיקלי (לדוגמה: "Yamaha Genos 2") ו-AI יחולל ערך אנציקלופדי מלא בעברית.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="term">מושג / כותרת הערך</Label>
            <Input
              id="term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="לדוגמה: Yamaha Genos 2"
              disabled={loading}
              className="bg-card border-amber-500/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">קטגוריה</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Category)}
              disabled={loading}
            >
              <SelectTrigger id="category" className="bg-card border-amber-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 font-semibold text-base shadow-lg shadow-amber-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                מחולל ערך... (עד 30 שניות)
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 ml-2" />
                ✨ חולל ערך ויקיפדיה באמצעות AI
              </>
            )}
          </Button>

          {lastCreated && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">הערך נוצר בהצלחה:</p>
                <p className="font-semibold">{lastCreated.title}</p>
              </div>
              <Button asChild variant="outline" className="border-amber-500/30">
                <Link to="/wiki/$slug" params={{ slug: lastCreated.slug }}>
                  <ExternalLink className="h-4 w-4 ml-1" />
                  צפה בערך
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
