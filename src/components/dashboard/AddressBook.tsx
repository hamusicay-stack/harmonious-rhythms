import { useEffect, useState } from "react";
import { Loader2, Save, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AddrProfile = {
  address_street?: string | null;
  address_city?: string | null;
  address_zip?: string | null;
};

export function AddressBook({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ street: "", city: "", zip: "" });

  useEffect(() => {
    const p = profile as AddrProfile | null;
    if (p) {
      setForm({
        street: p.address_street ?? "",
        city: p.address_city ?? "",
        zip: p.address_zip ?? "",
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          address_street: form.street || null,
          address_city: form.city || null,
          address_zip: form.zip || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("פנקס הכתובות נשמר");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 md:p-8" dir="rtl">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-2">
          <MapPin className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">פנקס כתובות</h2>
          <p className="text-sm text-muted-foreground">
            כתובת ברירת מחדל למשלוח — תתמלא אוטומטית בקופה.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="addr_street">רחוב ומספר בית</Label>
          <Input
            id="addr_street"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            placeholder="דיזנגוף 100, דירה 5"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="addr_city">עיר</Label>
            <Input
              id="addr_city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="תל אביב"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr_zip">מיקוד</Label>
            <Input
              id="addr_zip"
              value={form.zip}
              dir="ltr"
              onChange={(e) => setForm({ ...form, zip: e.target.value })}
              placeholder="6100000"
            />
          </div>
        </div>
        <div className="flex justify-end border-t border-border/40 pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold"
          >
            {saving ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="ml-2 h-4 w-4" />
            )}
            שמור כתובת
          </Button>
        </div>
      </form>
    </Card>
  );
}
