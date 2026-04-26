import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Award, CheckCircle2, GraduationCap, ShieldCheck, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify/$code")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("academy_certificates")
      .select("certificate_number, recipient_name, course_title, issued_at")
      .eq("certificate_number", params.code.toUpperCase())
      .maybeSingle();
    if (error || !data) throw notFound();
    return { cert: data };
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `אימות תעודה ${params.code} — המוזיקאי` },
      { name: "description", content: loaderData?.cert ? `תעודה אמיתית עבור ${loaderData.cert.recipient_name} — ${loaderData.cert.course_title}` : "אימות תעודה" },
      { property: "og:title", content: `תעודה מאומתת — ${loaderData?.cert?.course_title ?? ""}` },
    ],
  }),
  component: VerifyPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
          <ShieldCheck className="h-8 w-8 text-rose-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">תעודה לא נמצאה</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          הקוד שסרקת אינו תקף או שהתעודה הוסרה. ייתכן שמדובר בזיוף.
        </p>
        <Link to="/academy"><Button variant="outline">חזרה לאקדמיה</Button></Link>
      </div>
    </SiteLayout>
  ),
});

function VerifyPage() {
  const { cert } = Route.useLoaderData();
  const issued = new Date(cert.issued_at).toLocaleDateString("he-IL", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-xl px-4 py-10 md:py-16">
        <Card className="overflow-hidden border-emerald-500/30">
          <div className="bg-gradient-to-l from-emerald-500/15 via-emerald-500/5 to-background p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">תעודה מאומתת</h1>
            <p className="text-sm text-muted-foreground">הונפקה רשמית על ידי האקדמיה של המוזיקאי</p>
          </div>
          <CardContent className="space-y-4 p-6">
            <Row icon={<Award className="h-4 w-4" />} label="מספר תעודה" value={cert.certificate_number} mono />
            <Row icon={<GraduationCap className="h-4 w-4" />} label="קורס" value={cert.course_title} />
            <Row icon={<ShieldCheck className="h-4 w-4" />} label="הוענקה ל" value={cert.recipient_name} />
            <Row icon={<Calendar className="h-4 w-4" />} label="תאריך הנפקה" value={issued} />
            <div className="border-t pt-4 text-center">
              <Link to="/academy"><Button>גלה את האקדמיה</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}

function Row({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value}</div>
      </div>
    </div>
  );
}
