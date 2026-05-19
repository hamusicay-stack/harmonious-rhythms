import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, HardDrive, Search, Trash2, AlertTriangle, RefreshCw, FolderOpen, FileWarning } from "lucide-react";
import { requireAdmin } from "@/lib/routeGuards";
import { listStorageBuckets, listStorageObjects, findStorageOrphans, deleteStorageObject } from "@/lib/storageExplorer.functions";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/admin/commerce/storage-explorer")({
  beforeLoad: requireAdmin,
  head: () => ({
    meta: [
      { title: "סייר אחסון — ניהול" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StorageExplorerPage,
});

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const k = 1024, units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function StorageExplorerPage() {
  const qc = useQueryClient();
  const fetchBuckets = useServerFn(listStorageBuckets);
  const fetchObjects = useServerFn(listStorageObjects);
  const fetchOrphans = useServerFn(findStorageOrphans);
  const deleteObj = useServerFn(deleteStorageObject);

  const [bucket, setBucket] = useState<string>("");
  const [search, setSearch] = useState("");

  const bucketsQ = useQuery({ queryKey: ["storage", "buckets"], queryFn: () => fetchBuckets() });

  useEffect(() => {
    if (!bucket && bucketsQ.data && bucketsQ.data.length > 0) {
      setBucket(bucketsQ.data[0].name);
    }
  }, [bucketsQ.data, bucket]);

  const objectsQ = useQuery({
    queryKey: ["storage", "objects", bucket],
    queryFn: () => fetchObjects({ data: { bucket } }),
    enabled: !!bucket,
  });

  const orphansQ = useQuery({
    queryKey: ["storage", "orphans", bucket],
    queryFn: () => fetchOrphans({ data: { bucket } }),
    enabled: !!bucket,
  });

  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const del = useMutation({
    mutationFn: async (path: string) => {
      setPendingPath(path);
      try { return await deleteObj({ data: { bucket, path } }); }
      finally { setPendingPath(null); }
    },
    onSuccess: () => {
      toast.success("הקובץ נמחק");
      qc.invalidateQueries({ queryKey: ["storage"] });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const handleDelete = (path: string) => {
    if (!confirm(`למחוק את הקובץ?\n\n${bucket}/${path}\n\nפעולה זו בלתי הפיכה.`)) return;
    del.mutate(path);
  };

  const filteredObjects = useMemo(() => {
    const list = objectsQ.data?.objects ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(o => o.path.toLowerCase().includes(q));
  }, [objectsQ.data, search]);

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            סייר אחסון
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["storage"] })}
            disabled={objectsQ.isFetching || orphansQ.isFetching}
          >
            <RefreshCw className={`ml-2 h-4 w-4 ${objectsQ.isFetching ? "animate-spin" : ""}`} />
            רענן
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[260px_1fr]">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">בחר Bucket</label>
              <Select value={bucket} onValueChange={setBucket}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר bucket" />
                </SelectTrigger>
                <SelectContent>
                  {(bucketsQ.data ?? []).map(b => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name} {b.public ? "🌐" : "🔒"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">חיפוש</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש בשם הקובץ..." className="pr-10" />
              </div>
            </div>
          </div>

          {objectsQ.data && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                <FolderOpen className="ml-1 h-3 w-3" /> {objectsQ.data.count} קבצים
              </Badge>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                סה״כ: {formatBytes(objectsQ.data.totalBytes)}
              </Badge>
              {orphansQ.data?.hasScanner ? (
                <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                  <FileWarning className="ml-1 h-3 w-3" />
                  יתומים: {orphansQ.data.orphanCount} ({formatBytes(orphansQ.data.orphanBytes)})
                </Badge>
              ) : orphansQ.data ? (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600">
                  אין סורק יתומים ל-bucket זה
                </Badge>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">כל הקבצים</TabsTrigger>
          <TabsTrigger value="orphans">
            <AlertTriangle className="ml-2 h-4 w-4" />
            יתומים ({orphansQ.data?.orphanCount ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {objectsQ.isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <FileTable rows={filteredObjects} onDelete={handleDelete} deletingPath={del.isPending ? del.variables : null} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orphans" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {!orphansQ.data?.hasScanner ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  עבור bucket זה אין סורק יתומים מוגדר. מחיקה ידנית בלבד מתוך הטאב "כל הקבצים".
                </p>
              ) : orphansQ.isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <FileTable rows={orphansQ.data.orphans} onDelete={handleDelete} deletingPath={del.isPending ? del.variables : null} highlight />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Row = { name: string; path: string; size: number; updated_at: string | null; created_at: string | null; mimetype: string | null };

function FileTable({ rows, onDelete, deletingPath, highlight }: { rows: Row[]; onDelete: (path: string) => void; deletingPath: string | null; highlight?: boolean }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">אין קבצים להצגה.</p>;
  }
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">נתיב</TableHead>
            <TableHead className="text-right">סוג</TableHead>
            <TableHead className="text-right">גודל</TableHead>
            <TableHead className="text-right">עודכן</TableHead>
            <TableHead className="text-right w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.path} className={highlight ? "bg-destructive/5" : ""}>
              <TableCell className="font-mono text-xs">{r.path}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.mimetype ?? "—"}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{formatBytes(r.size)}</TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {r.updated_at ? new Date(r.updated_at).toLocaleString("he-IL") : "—"}
              </TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(r.path)}
                  disabled={deletingPath === r.path}
                >
                  {deletingPath === r.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
