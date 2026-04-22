import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, ShoppingBag, GraduationCap, Tags, Sparkles, Users, ShieldCheck, Headphones, ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { BannerSlot } from "@/components/BannerSlot";

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

const modules = [
  { to: "/forum" as const, icon: MessageSquare, title: "פורום", desc: "דיונים, שאלות ושיתופי ידע בין מוזיקאים." },
  { to: "/shop" as const, icon: ShoppingBag, title: "חנות", desc: "מקצבים, סאמפלים, פלאגינים וציוד מקצועי." },
  { to: "/academy" as const, icon: GraduationCap, title: "אקדמיה", desc: "קורסים, שיעורים ומאסטרקלאסים מהמובילים בתחום." },
  { to: "/marketplace" as const, icon: Tags, title: "יד שנייה", desc: "כלי נגינה וציוד הקלטה במחירים נוחים." },
];

const features = [
  { icon: Sparkles, title: "חוויה יוקרתית", desc: "עיצוב מינימליסטי ומוקפד שמכבד את היצירה שלך." },
  { icon: Users, title: "קהילה פעילה", desc: "אלפי מוזיקאים, מפיקים ומורים שותפים לדרך." },
  { icon: ShieldCheck, title: "סביבה מאובטחת", desc: "תשלומים מאובטחים, פרטיות מלאה והגנה על תכנים." },
  { icon: Headphones, title: "תוכן איכותי", desc: "כל הפריטים נבחרים בקפידה — בלי רעש מיותר." },
];

function HomePage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.78_0.14_75/0.15),transparent_50%)]" />
        <div className="container relative mx-auto px-4 py-24 md:px-8 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              הפלטפורמה החדשה למוזיקאים
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
              כל מה שמוזיקאי צריך
              <br />
              <span className="text-gradient-gold">במקום אחד.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              פורום מקצועי, חנות, אקדמיה ולוח יד שנייה — מתחת לקורת גג אחת מעוצבת ומוקפדת.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold hover:opacity-90">
                  הצטרפו עכשיו
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/forum">
                <Button size="lg" variant="outline">
                  גלו את הפורום
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Top banner slot */}
      <section className="container mx-auto px-4 pt-6 md:px-8">
        <BannerSlot position="home_top" />
      </section>

      {/* Modules */}
      <section className="border-t border-border/40 py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">המודולים שלנו</h2>
            <p className="mt-3 text-muted-foreground">
              ארבעה עולמות שלמים שמתחברים לחוויה אחת חלקה.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {modules.map((m) => (
              <Link key={m.to} to={m.to} className="group">
                <div className="h-full rounded-2xl border border-border/60 bg-card-elevated p-6 transition-smooth hover:border-primary/40 hover:shadow-gold">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                    <m.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold">{m.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-smooth group-hover:opacity-100">
                    גלו עוד <ArrowLeft className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
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
