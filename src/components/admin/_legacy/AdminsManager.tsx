import { friendlyError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AdminEntry = { user_id: string; email: string; granted_at: string };

export function AdminsManager() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_admins");
    if (error) toast.error(friendlyError(error));
    setAdmins((data as AdminEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grant = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setAdding(true);
    const { error } = await supabase.rpc("admin_assign_role_by_email", {
      _email: e, _role: "admin", _revoke: false,
    });
    setAdding(false);
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(`הוקצתה הרשאת מנהל ל-${e}`);
    setEmail("");
    load();
  };

  const revoke = async (targetEmail: string) => {
    if (!confirm(`להסיר את הרשאת המנהל מ-${targetEmail}?`)) return;
    const { error } = await supabase.rpc("admin_assign_role_by_email", {
      _email: targetEmail, _role: "admin", _revoke: true,
    });
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("הרשאת המנהל הוסרה");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ניהול מנהלים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border/60 p-4">
          <Label className="mb-2 block">הוסף מנהל לפי אימייל</Label>
          <p className="mb-3 text-xs text-muted-foreground">
            המשתמש חייב להירשם תחילה למערכת. הזן את האימייל שלו והוא יקבל הרשאת מנהל.
          </p>
          <div className="flex gap-2">
            <Input
              dir="ltr"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") grant(); }}
            />
            <Button onClick={grant} disabled={adding || !email.trim()}>
              {adding ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Plus className="ml-2 h-4 w-4" />}
              הענק הרשאה
            </Button>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium">מנהלים נוכחיים ({admins.length})</h3>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>אימייל</TableHead>
                  <TableHead>הוענק בתאריך</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.user_id}>
                    <TableCell dir="ltr">{a.email}</TableCell>
                    <TableCell>{new Date(a.granted_at).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell className="text-end">
                      {a.user_id === user?.id ? (
                        <Badge variant="outline">אתה</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(a.email)}>
                          <Trash2 className="ml-1 h-4 w-4" />הסר
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-6 text-center text-muted-foreground">אין מנהלים.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
