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
            <h2 className="font-display text-3xl font-bold md:text-4xl">למה <span className="text-gradient-brand">המוזיקאי</span></h2>
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

      {/* Features */}
      <section className="border-t border-border/40 bg-card/30 py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">למה <span className="text-gradient-gold">המוזיקאי</span></h2>
            <p className="mt-3 text-muted-foreground">
              נבנה מהיסוד למקצוענים — בקפידה, בטעם ובלי פשרות.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border/60 p-6">
                <f.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shorts CTA */}
      <section className="border-t border-border/40 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-8">
          <Link to="/shorts" className="group block">
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-secondary to-card p-8 md:p-12 transition-smooth hover:border-primary/60 hover:shadow-gold">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,oklch(0.78_0.14_75/0.18),transparent_60%)]" />
              <div className="relative flex flex-col md:flex-row items-center gap-8">
                <div className="flex h-24 w-24 md:h-32 md:w-32 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-glow shadow-gold">
                  <Play className="h-12 w-12 md:h-16 md:w-16 fill-primary-foreground text-primary-foreground" />
                </div>
                <div className="flex-1 text-center md:text-right">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Crown className="h-3 w-3" />חדש בפלטפורמה
                  </div>
                  <h2 className="font-display text-3xl font-bold md:text-4xl">
                    המוזיקאי <span className="text-gradient-gold">שורטס</span>
                  </h2>
                  <p className="mt-3 text-muted-foreground md:text-lg">
                    סרטונים קצרים מהמוזיקאים הכי חמים — סולואים, ביטים וקליפים אנכיים בסטייל TikTok.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    צפו בפיד <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card to-secondary p-10 text-center shadow-elegant md:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,oklch(0.78_0.14_75/0.18),transparent_60%)]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold md:text-5xl">
                מוכנים להצטרף לקהילה?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                הרשמה חינם — וכבר היום בפורום, באקדמיה ובחנות.
              </p>
              <Link to="/auth">
                <Button size="lg" className="mt-8 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold hover:opacity-90">
                  פתחו חשבון חינם
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
