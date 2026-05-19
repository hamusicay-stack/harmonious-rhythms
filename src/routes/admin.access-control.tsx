import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Trash2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/access-control")({
  head: () => ({
    meta: [
      { title: "בקרת גישה — אימיילים מאושרים" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccessControlPage,
});

type Row = { email: string; note: string | null; created_at: string };

function AccessControlPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("allowed_emails")
      .select("email, note, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("כתובת מייל לא תקינה");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_allowed_email", {
      _email: trimmed,
      _note: note.trim() || null,
      _reason: "admin_panel_add",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("נוסף לרשימה");
    setEmail(""); setNote("");
    void load();
  };

  const handleRemove = async (target: string) => {
    if (!confirm(`להסיר את ${target} מהרשימה?`)) return;
    const { error } = await supabase.rpc("admin_remove_allowed_email", {
      _email: target,
      _reason: "admin_panel_remove",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("הוסר מהרשימה");
    void load();
  };

  const visible = rows.filter(r =>
    !filter.trim() || r.email.toLowerCase().includes(filter.trim().toLowerCase())
    || (r.note ?? "").toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold">בקרת גישה</h1>
          <p className="text-sm text-muted-foreground">רק אימיילים שברשימה יוכלו להירשם או להתחבר לאתר.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>הוספת אימייל לרשימה</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="ae-email">אימייל</Label>
              <Input id="ae-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ae-note">הערה (אופציונלי)</Label>
              <Input id="ae-note" value={note} onChange={e => setNote(e.target.value)} placeholder="בטא טסטר / לקוח / שותף" />
            </div>
            <Button type="submit" disabled={busy} className="md:w-auto">
              {busy && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              הוסף
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>רשימת אימיילים מאושרים ({rows.length})</CardTitle>
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="חיפוש..." className="max-w-xs" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">אין רשומות.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">הערה</TableHead>
                  <TableHead className="text-right">נוסף ב</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(r => (
                  <TableRow key={r.email}>
                    <TableCell className="font-mono text-sm">{r.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.note ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("he-IL")}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(r.email)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
