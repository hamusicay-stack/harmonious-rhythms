import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Inbox, Send, Phone, Mail, MapPin, Calendar, DollarSign,
  CheckCircle2, XCircle, Clock, PlayCircle, MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pros/my-inquiries")({
  head: () => ({
    meta: [
      { title: "ההזמנות שלי — המוזיקאי" },
      { name: "description", content: "ניהול בקשות הזמנה ששלחת או קיבלת ממוזיקאים מקצועיים." },
    ],
  }),
  component: MyInquiriesPage,
});

type InquiryStatus = "new" | "in_progress" | "completed" | "cancelled";

type Inquiry = {
  id: string;
  pro_id: string;
  sender_id: string | null;
  sender_name: string;
  contact_phone: string;
  contact_email: string | null;
  event_type: string;
  event_date: string | null;
  location: string | null;
  budget: number | null;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
  pro?: { display_name: string; profile_image: string | null } | null;
};

const STATUS_META: Record<InquiryStatus, { label: string; icon: typeof Clock; cls: string }> = {
  new: { label: "חדשה", icon: Clock, cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  in_progress: { label: "בטיפול", icon: PlayCircle, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  completed: { label: "הושלמה", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "בוטלה", icon: XCircle, cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
};

function MyInquiriesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<Inquiry[]>([]);
  const [sent, setSent] = useState<Inquiry[]>([]);
  const [myProId, setMyProId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1) Find if the user is a pro
      const { data: myPro } = await supabase
        .from("music_pros").select("id").eq("user_id", user.id).maybeSingle();
      setMyProId(myPro?.id ?? null);

      // 2) Fetch sent inquiries
      const { data: sentRows, error: sentErr } = await supabase
        .from("music_pro_inquiries")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false });
      if (sentErr) throw sentErr;

      // 3) Fetch received (only if user has a pro profile — RLS allows pro owner)
      let receivedRows: Inquiry[] = [];
      if (myPro?.id) {
        const { data: recv, error: recvErr } = await supabase
          .from("music_pro_inquiries")
          .select("*")
          .eq("pro_id", myPro.id)
          .order("created_at", { ascending: false });
        if (recvErr) throw recvErr;
        receivedRows = (recv ?? []) as Inquiry[];
      }

      // Hydrate pro display info for sent list
      const proIds = Array.from(new Set((sentRows ?? []).map((r) => r.pro_id)));
      let proMap = new Map<string, { display_name: string; profile_image: string | null }>();
      if (proIds.length > 0) {
        const { data: pros } = await supabase
          .from("music_pros").select("id, display_name, profile_image").in("id", proIds);
        proMap = new Map((pros ?? []).map((p) => [p.id, { display_name: p.display_name, profile_image: p.profile_image }]));
      }

      setSent(((sentRows ?? []) as Inquiry[]).map((i) => ({ ...i, pro: proMap.get(i.pro_id) ?? null })));
      setReceived(receivedRows);
    } catch (e: any) {
      console.error("Failed to load inquiries", e);
      toast.error(e?.message ?? "טעינת ההזמנות נכשלה");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (id: string, status: InquiryStatus) => {
    const { error } = await supabase
      .from("music_pro_inquiries")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`הסטטוס עודכן ל"${STATUS_META[status].label}"`);
    setReceived((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  if (authLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-lg">יש להתחבר כדי לראות את ההזמנות שלך</p>
        <Button onClick={() => navigate({ to: "/auth" })}>התחברות</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 text-right">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-gold">
          <Inbox className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">ההזמנות שלי</h1>
          <p className="text-sm text-muted-foreground">בקשות שקיבלת ושלחת למוזיקאים</p>
        </div>
      </div>

      <Tabs defaultValue={myProId ? "received" : "sent"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {myProId && (
            <TabsTrigger value="received" className="gap-1.5">
              <Inbox className="h-4 w-4" /> בקשות שקיבלתי
              {received.filter((i) => i.status === "new").length > 0 && (
                <Badge variant="default" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                  {received.filter((i) => i.status === "new").length}
                </Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="sent" className={cn("gap-1.5", !myProId && "col-span-2")}>
            <Send className="h-4 w-4" /> בקשות ששלחתי
          </TabsTrigger>
        </TabsList>

        {myProId && (
          <TabsContent value="received" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : received.length === 0 ? (
              <EmptyState icon={Inbox} text="עדיין לא קיבלת בקשות" />
            ) : (
              received.map((inq) => (
                <ReceivedCard key={inq.id} inquiry={inq} onUpdateStatus={updateStatus} />
              ))
            )}
          </TabsContent>
        )}

        <TabsContent value="sent" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : sent.length === 0 ? (
            <EmptyState icon={Send} text="עדיין לא שלחת בקשות. צפה במוזיקאים בעמוד הראשי" cta={{ label: "לעמוד המוזיקאים", to: "/pros" }} />
          ) : (
            sent.map((inq) => <SentCard key={inq.id} inquiry={inq} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon: Icon, text, cta,
}: { icon: typeof Inbox; text: string; cta?: { label: string; to: string } }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Icon className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{text}</p>
        {cta && (
          <Button asChild size="sm" variant="outline">
            <Link to={cta.to as string}>{cta.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-semibold", meta.cls)}>
      <Icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

function InquiryDetails({ inquiry }: { inquiry: Inquiry }) {
  return (
    <div className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
      <div className="flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> סוג אירוע: <span className="text-foreground font-medium">{inquiry.event_type}</span>
      </div>
      {inquiry.event_date && (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> {new Date(inquiry.event_date).toLocaleDateString("he-IL")}
        </div>
      )}
      {inquiry.location && (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> {inquiry.location}
        </div>
      )}
      {inquiry.budget && (
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" /> תקציב: ₪{inquiry.budget.toLocaleString("he-IL")}
        </div>
      )}
    </div>
  );
}

function ReceivedCard({
  inquiry, onUpdateStatus,
}: { inquiry: Inquiry; onUpdateStatus: (id: string, s: InquiryStatus) => void }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold">{inquiry.sender_name}</h3>
            <p className="text-[11px] text-muted-foreground">
              {new Date(inquiry.created_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
          <StatusBadge status={inquiry.status} />
        </div>

        <InquiryDetails inquiry={inquiry} />

        {inquiry.message && (
          <p className="rounded-md bg-muted/50 p-2 text-sm leading-relaxed">{inquiry.message}</p>
        )}

        {/* Contact reveal: pro owner sees contacts immediately */}
        <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
          <a href={`tel:${inquiry.contact_phone}`} dir="ltr" className="flex items-center gap-1.5 text-primary hover:underline">
            <Phone className="h-4 w-4" /> {inquiry.contact_phone}
          </a>
          <a
            href={`https://wa.me/${inquiry.contact_phone.replace(/\D/g, "").replace(/^0/, "972")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
          >
            WhatsApp
          </a>
          {inquiry.contact_email && (
            <a href={`mailto:${inquiry.contact_email}`} dir="ltr" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
              <Mail className="h-4 w-4" /> {inquiry.contact_email}
            </a>
          )}
        </div>

        {inquiry.status !== "completed" && inquiry.status !== "cancelled" && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {inquiry.status === "new" && (
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(inquiry.id, "in_progress")}>
                <PlayCircle className="ml-1 h-4 w-4" /> סמן כבטיפול
              </Button>
            )}
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onUpdateStatus(inquiry.id, "completed")}>
              <CheckCircle2 className="ml-1 h-4 w-4" /> סגור כבוצע
            </Button>
            <Button size="sm" variant="outline" className="text-rose-600 hover:bg-rose-500/10" onClick={() => onUpdateStatus(inquiry.id, "cancelled")}>
              <XCircle className="ml-1 h-4 w-4" /> בטל
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SentCard({ inquiry }: { inquiry: Inquiry }) {
  const proName = inquiry.pro?.display_name ?? "מוזיקאי";
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to="/pros/$proId" params={{ proId: inquiry.pro_id }} className="font-bold hover:text-primary">
              {proName}
            </Link>
            <p className="text-[11px] text-muted-foreground">
              נשלח: {new Date(inquiry.created_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
          <StatusBadge status={inquiry.status} />
        </div>

        <InquiryDetails inquiry={inquiry} />

        {inquiry.message && (
          <p className="rounded-md bg-muted/50 p-2 text-sm leading-relaxed">{inquiry.message}</p>
        )}

        {inquiry.status === "completed" && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-400">
            ✓ הבקשה הושלמה. אם נתקלת בבעיה — צור קשר עם התמיכה.
          </div>
        )}
        {inquiry.status === "cancelled" && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-400">
            הבקשה בוטלה.
          </div>
        )}

        <div className="border-t pt-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/pros/$proId" params={{ proId: inquiry.pro_id }}>צפה בפרופיל המוזיקאי</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
