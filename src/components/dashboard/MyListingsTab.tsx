import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, Plus, Tags, Eye, ArrowUp, Trash2, Phone, MessageCircle, Heart,
  CheckCircle2, Clock, XCircle, PackageCheck, EyeOff,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BoostListingDialog } from "@/components/marketplace/BoostListingDialog";
import { MarkAsSoldDialog } from "@/components/marketplace/MarkAsSoldDialog";
import { OffersReceivedPanel } from "@/components/dashboard/OffersReceivedPanel";

export type Listing = {
  id: string; title: string; price: number; status: string; views_count: number;
  images: string[]; created_at: string; bump_expires_at: string | null;
  category: string; brand: string | null;
  is_sold?: boolean | null; sold_at?: string | null;
};

function statusBadge(status: string) {
  if (status === "approved") return <Badge className="gap-1 bg-emerald-500"><CheckCircle2 className="h-3 w-3" />פעיל</Badge>;
  if (status === "pending") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />ממתין לאישור</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />נדחה</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function MyListingsTab({ userId }: { userId: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Record<string, { phone: number; whatsapp: number; likes: number }>>({});
  const [loading, setLoading] = useState(true);
  const [boostId, setBoostId] = useState<string | null>(null);
  const [soldFor, setSoldFor] = useState<Listing | null>(null);
  const [pendingSoldIds, setPendingSoldIds] = useState<Set<string>>(new Set());
  const [takeDownFor, setTakeDownFor] = useState<Listing | null>(null);
  const [takingDown, setTakingDown] = useState(false);

  const handleTakeDown = async () => {
    if (!takeDownFor) return;
    setTakingDown(true);
    const { error } = await supabase
      .from("marketplace_listings")
      .update({ status: "archived" })
      .eq("id", takeDownFor.id);
    setTakingDown(false);
    if (error) { toast.error(error.message); return; }
    // Optimistic client update — no full refresh
    setListings((prev) => prev.map((l) => l.id === takeDownFor.id ? { ...l, status: "archived" } : l));
    setTakeDownFor(null);
    toast.success("המודעה הוסרה והועברה לארכיון בהצלחה 👍");
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_listings")
      .select("id, title, price, status, views_count, images, created_at, bump_expires_at, category, brand, is_sold, sold_at")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });
    const items = (data ?? []) as Listing[];
    setListings(items);

    // Pending deal confirmations awaiting buyer response
    if (items.length > 0) {
      const { data: pendings } = await supabase
        .from("marketplace_deal_confirmations")
        .select("listing_id")
        .eq("seller_id", userId)
        .eq("status", "pending_buyer_confirmation");
      setPendingSoldIds(new Set((pendings ?? []).map((p: any) => p.listing_id)));
    } else {
      setPendingSoldIds(new Set());
    }

    if (items.length > 0) {
      const ids = items.map((l) => l.id);
      const { data: events } = await supabase
        .from("marketplace_listing_events")
        .select("listing_id, event_type")
        .in("listing_id", ids);
      const acc: Record<string, { phone: number; whatsapp: number; likes: number }> = {};
      for (const id of ids) acc[id] = { phone: 0, whatsapp: 0, likes: 0 };
      for (const ev of events ?? []) {
        const row = acc[ev.listing_id];
        if (!row) continue;
        if (ev.event_type === "phone_click") row.phone++;
        else if (ev.event_type === "whatsapp_click") row.whatsapp++;
        else if (ev.event_type === "like") row.likes++;
        else if (ev.event_type === "unlike") row.likes = Math.max(0, row.likes - 1);
      }
      setStats(acc);
    } else {
      setStats({});
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);
  const activeCount = listings.filter((l) => l.status === "approved").length;

  const remove = async (id: string) => {
    if (!confirm("למחוק את המודעה?")) return;
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("נמחק");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <OffersReceivedPanel userId={userId} />
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-primary">{listings.length}</div>
          <div className="text-xs text-muted-foreground">מודעות סה"כ</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-500">{activeCount}</div>
          <div className="text-xs text-muted-foreground">פעילות</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold flex items-center justify-center gap-1">
            <Eye className="h-5 w-5 text-muted-foreground" />{totalViews}
          </div>
          <div className="text-xs text-muted-foreground">צפיות סה"כ</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Link to="/marketplace/new">
          <Button size="sm"><Plus className="h-4 w-4" />פרסם מודעה חדשה</Button>
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Tags className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">עוד לא פרסמת מודעות</p>
          <Link to="/marketplace/new"><Button>פרסם את המודעה הראשונה</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const bumped = l.bump_expires_at && new Date(l.bump_expires_at) > new Date();
            return (
              <div key={l.id} className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row gap-4">
                <Link to="/marketplace/$listingId" params={{ listingId: l.id }} className="shrink-0">
                  <div className="w-full sm:w-24 h-24 rounded-lg bg-muted overflow-hidden">
                    {l.images?.[0] && <img src={l.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                </Link>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <Link to="/marketplace/$listingId" params={{ listingId: l.id }} className="font-semibold hover:text-primary line-clamp-1">
                      {l.title}
                    </Link>
                    <div className="flex flex-wrap gap-1">
                      {l.is_sold
                        ? <Badge className="gap-1 bg-primary"><PackageCheck className="h-3 w-3" />נמכר</Badge>
                        : statusBadge(l.status)}
                      {pendingSoldIds.has(l.id) && !l.is_sold && (
                        <Badge variant="outline" className="gap-1 border-primary/50 text-primary"><Clock className="h-3 w-3" />ממתין לאישור הקונה</Badge>
                      )}
                      {bumped && <Badge className="gap-1"><ArrowUp className="h-3 w-3" />מוקפץ</Badge>}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-primary">₪{Number(l.price).toLocaleString()}</span>
                    <span className="flex items-center gap-1" title="צפיות"><Eye className="h-3 w-3" />{l.views_count || 0}</span>
                    <span className="flex items-center gap-1" title="לחיצות על חיוג"><Phone className="h-3 w-3" />{stats[l.id]?.phone ?? 0}</span>
                    <span className="flex items-center gap-1" title="לחיצות על וואטסאפ"><MessageCircle className="h-3 w-3" />{stats[l.id]?.whatsapp ?? 0}</span>
                    <span className="flex items-center gap-1 text-rose-500" title="לייקים"><Heart className="h-3 w-3" />{stats[l.id]?.likes ?? 0}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {l.status === "approved" && !bumped && !l.is_sold && (
                      <Button size="sm" variant="outline" onClick={() => setBoostId(l.id)}>
                        <ArrowUp className="h-3 w-3" />הקפץ מודעה
                      </Button>
                    )}
                    {l.status === "approved" && !l.is_sold && !pendingSoldIds.has(l.id) && (
                      <Button
                        size="sm"
                        onClick={() => setSoldFor(l)}
                        className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                      >
                        <PackageCheck className="h-3 w-3" />סמן כנמכר
                      </Button>
                    )}
                    {l.status === "approved" && !l.is_sold && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setTakeDownFor(l); }}
                        className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400"
                      >
                        <EyeOff className="h-3 w-3" />הורד מודעה מהאוויר
                      </Button>
                    )}
                    <Link to="/marketplace/$listingId" params={{ listingId: l.id }}>
                      <Button size="sm" variant="outline">צפה</Button>
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => remove(l.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />מחק
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {boostId && (
        <BoostListingDialog
          listingId={boostId}
          open={!!boostId}
          onOpenChange={(o) => { if (!o) setBoostId(null); }}
          onBumped={load}
        />
      )}
      {soldFor && (
        <MarkAsSoldDialog
          open={!!soldFor}
          onOpenChange={(o) => { if (!o) setSoldFor(null); }}
          listingId={soldFor.id}
          listingTitle={soldFor.title}
          sellerId={userId}
          onDone={load}
        />
      )}
      <AlertDialog open={!!takeDownFor} onOpenChange={(o) => { if (!o) setTakeDownFor(null); }}>
        <AlertDialogContent className="border-amber-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-gradient-gold">הורדת מודעה מהאוויר</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך להוריד את המודעה <span className="font-semibold text-foreground">"{takeDownFor?.title}"</span> מהאתר?
              <br />המודעה תועבר לארכיון ולא תופיע יותר בחיפוש. תוכל לפנות לתמיכה כדי להחזיר אותה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={takingDown}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTakeDown}
              disabled={takingDown}
              className="bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600"
            >
              {takingDown ? "מוריד..." : "כן, הורד מהאוויר"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
