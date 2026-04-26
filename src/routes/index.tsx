import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Users, ShieldCheck, Headphones, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { BannerSlot } from "@/components/BannerSlot";
import { BentoHero } from "@/components/BentoHero";
import { GlassCard } from "@/components/GlassCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "המוזיקאי — הפלטפורמה המובילה למוזיקאים" },
      { name: "description", content: "פורום, חנות, אקדמיה ולוח יד שנייה — כל מה שמוזיקאי צריך במקום אחד." },
      { property: "og:title", content: "המוזיקאי — הפלטפורמה המובילה למוזיקאים" },
      { property: "og:description", content: "פורום, חנות, אקדמיה ולוח יד שנייה — כל מה שמוזיקאי צריך במקום אחד." },
    ],
  }),
  component: HomePage,
});

const features = [
  { icon: Sparkles, title: "חוויה יוקרתית", desc: "עיצוב מינימליסטי ומוקפד שמכבד את היצירה שלך." },
  { icon: Users, title: "קהילה פעילה", desc: "אלפי מוזיקאים, מפיקים ומורים שותפים לדרך." },
  { icon: ShieldCheck, title: "סביבה מאובטחת", desc: "תשלומים מאובטחים, פרטיות מלאה והגנה על תכנים." },
  { icon: Headphones, title: "תוכן איכותי", desc: "כל הפריטים נבחרים בקפידה — בלי רעש מיותר." },
];

function HomePage() {
  return (
    <SiteLayout>
      {/* Bento Hero — Sonic Glass v5 */}
      <BentoHero />

      {/* Top banner slot */}
      <section className="container mx-auto px-4 pt-2 md:px-8">
        <BannerSlot position="home_top" />
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              למה <span className="text-gradient-brand">המוזיקאי</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              נבנה מהיסוד למקצוענים — בקפידה, בטעם ובלי פשרות.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <GlassCard key={f.title} level="z2" interactive parallax className="p-6">
                <f.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <GlassCard level="z3" parallax className="p-10 text-center md:p-16">
            <h2 className="font-display text-3xl font-bold md:text-5xl">
              מוכנים להצטרף ל<span className="text-gradient-brand">קהילה</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              הרשמה חינם — וכבר היום בפורום, באקדמיה ובחנות.
            </p>
            <Link to="/auth">
              <Button size="lg" className="mt-8 bg-brand text-primary-foreground shadow-card hover:opacity-90">
                פתחו חשבון חינם
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>
          </GlassCard>
        </div>
      </section>
    </SiteLayout>
  );
}
