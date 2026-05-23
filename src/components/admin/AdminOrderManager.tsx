import { friendlyError } from "@/lib/errors";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Upload, CheckCircle2, FileUp } from "lucide-react";
import { toast } from "sonner";

type AdminOrder = {
  id: string;
  user_id: string;
  status: string;
  customer_email: string | null;
  info_file_path: string | null;
  info_file_url: string | null;
  cpi_file_path: string | null;
  cpi_file_url: string | null;
  created_at: string;
  rhythm_set_id: string;
  rhythm_set?: { set_name: string; creator_name: string };
  profile?: { display_name: string | null };
};

export function AdminOrderManager() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rhythm_orders" as any)
      .select("*, rhythm_set:rhythm_sets(set_name, creator_name), profile:profiles!rhythm_orders_user_id_fkey(display_name)")
      .order("created_at", { ascending: false });
    if (error) {
      // fallback without profile join (FK might not exist)
      const { data: d2, error: e2 } = await supabase
        .from("rhythm_orders" as any)
        .select("*, rhythm_set:rhythm_sets(set_name, creator_name)")
        .order("created_at", { ascending: false });
      if (e2) toast.error(e2.message);
      else setOrders((d2 ?? []) as unknown as AdminOrder[]);
    } else {
      setOrders((data ?? []) as unknown as AdminOrder[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const downloadInfo = async (o: AdminOrder) => {
    if (!o.info_file_path) {
      if (o.info_file_url) return window.open(o.info_file_url, "_blank");
      return toast.error("אין קובץ זיהוי להורדה");
    }
    const { data, error } = await supabase.storage.from("rhythm-files").createSignedUrl(o.info_file_path, 300);
    if (error) return toast.error(friendlyError(error));
    window.open(data.signedUrl, "_blank");
  };

  const uploadCpi = async (o: AdminOrder, file: File) => {
    setUploadingId(o.id);
    try {
      const path = `${o.user_id}/cpi/${o.id}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("rhythm-files").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("rhythm-files").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("rhythm_orders" as any)
        .update({ cpi_file_path: path, cpi_file_url: pub.publicUrl, status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("id", o.id);
      if (updErr) throw updErr;
      toast.success("CPI הועלה — ההזמנה הושלמה");
      void load();
    } catch (e: any) {
      toast.error(e.message ?? "שגיאה בהעלאה");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ניהול הזמנות קצבים</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">אין הזמנות עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>לקוח</TableHead>
                  <TableHead>קצב</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>קובץ זיהוי (.n27)</TableHead>
                  <TableHead>העלאת CPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{o.profile?.display_name ?? "—"}</div>
                      <div className="text-muted-foreground">{o.customer_email ?? o.user_id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{o.rhythm_set?.set_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.rhythm_set?.creator_name}</div>
                    </TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => void downloadInfo(o)} disabled={!o.info_file_path && !o.info_file_url}>
                        <Download className="ms-1 h-4 w-4" />הורד .n27
                      </Button>
                    </TableCell>
                    <TableCell>
                      <CpiDropzone
                        disabled={uploadingId === o.id || o.status === "completed"}
                        uploading={uploadingId === o.id}
                        completed={o.status === "completed"}
                        onFile={(f) => void uploadCpi(o, f)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge className="bg-green-600 hover:bg-green-600">הושלם</Badge>;
  if (status === "processing") return <Badge variant="secondary">בעיבוד</Badge>;
  if (status === "failed") return <Badge variant="destructive">נכשל</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function CpiDropzone({ onFile, disabled, uploading, completed }: { onFile: (f: File) => void; disabled?: boolean; uploading?: boolean; completed?: boolean }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  if (completed) {
    return <div className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-4 w-4" />הועלה</div>;
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`flex items-center gap-2 rounded-md border border-dashed px-3 py-2 cursor-pointer transition-colors text-xs ${
        drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        ref={ref}
        type="file"
        accept=".cpi"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          if (ref.current) ref.current.value = "";
        }}
      />
      {uploading ? (
        <><Loader2 className="h-4 w-4 animate-spin" />מעלה…</>
      ) : (
        <><FileUp className="h-4 w-4" />גרור .cpi או לחץ</>
      )}
    </label>
  );
}
