import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import {
  Music,
  Users,
  ShoppingBag,
  GraduationCap,
  MessageSquare,
  Briefcase,
  Sparkles,
  TrendingUp,
  Target,
  DollarSign,
  Globe,
  Shield,
  Zap,
  BarChart3,
  Rocket,
} from "lucide-react";

export const Route = createFileRoute("/investor")({
  head: () => ({
    meta: [
      { title: "אפיון עסקי — מצגת למשקיעים" },
      {
        name: "description",
        content:
          "אפיון עסקי מקיף של הפלטפורמה: חזון, מודל הכנסות, שוק יעד, ערוצי צמיחה ויתרון תחרותי.",
      },
    ],
  }),
  component: InvestorPage,
});

function InvestorPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-6xl px-4 py-12 space-y-16" dir="rtl">
        {/* Hero */}
        <section className="text-center space-y-6 py-12 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-border">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            מצגת למשקיעים · 2026
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            הבית הדיגיטלי <span className="text-primary">של המוזיקאי הישראלי</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            פלטפורמה אחת המאחדת קהילה, מסחר, אקדמיה ושירותים מקצועיים — אקו-סיסטם
            סגור שמייצר ערך לכל שחקן בתעשייה.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Stat label="מודולים פעילים" value="8+" />
            <Stat label="ערוצי הכנסה" value="6" />
            <Stat label="קהל יעד פוטנציאלי" value="250K+" />
          </div>
        </section>

        {/* Vision */}
        <Section icon={<Target />} title="חזון">
          <p className="text-lg leading-relaxed text-muted-foreground">
            להפוך לסטנדרט המוביל בישראל ובעולם דובר העברית עבור מוזיקאים — מקום
            אחד שבו נגן, מורה, תלמיד, מפיק ולקוח קצה נפגשים, לומדים, מוכרים
            וקונים. אנחנו בונים תשתית טכנולוגית ועסקית שמייצרת אפקט רשת חזק
            ומחסום כניסה משמעותי למתחרים.
          </p>
        </Section>

        {/* Problem & Solution */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="הבעיה" icon={<Zap />} tone="destructive">
            <ul className="space-y-2 text-muted-foreground">
              <li>• השוק המוזיקלי בישראל מפוצל בין פייסבוק, יד2, וואטסאפ ואתרים זרים.</li>
              <li>• אין פלטפורמה אחת אמינה לרכישת ציוד, ביט-סטים, שיעורים והזמנת מוזיקאים.</li>
              <li>• מורים, נגנים ויוצרים מתקשים להגיע לקהל ולגבות תשלום בצורה מקצועית.</li>
              <li>• חוסר בתוכן מקצועי בעברית — סרטונים, מאמרים וכלים.</li>
            </ul>
          </Card>
          <Card title="הפתרון" icon={<Rocket />} tone="primary">
            <ul className="space-y-2 text-muted-foreground">
              <li>• אקו-סיסטם מאוחד: פורום, חנות, אקדמיה, מרקטפלייס יד-שנייה, פרוס ושורטס.</li>
              <li>• מערכת תשלומים, חוזים, ביקורות ודירוגים מובנית.</li>
              <li>• כלי AI מובנים — שיפור תיאורי מוצר, ניתוח, תרגום, יצירת תוכן.</li>
              <li>• גיימיפיקציה ומועדון לקוחות שמייצרים שימוש חוזר ונאמנות.</li>
            </ul>
          </Card>
        </div>

        {/* Modules */}
        <Section icon={<Briefcase />} title="המודולים שלנו">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Module icon={<MessageSquare />} title="פורום קהילתי" desc="דיונים, שאלות-תשובות, הודעות פרטיות, מודרציה ודירוגים." />
            <Module icon={<ShoppingBag />} title="חנות מקצועית" desc="ציוד, ביט-סטים, מוצרים דיגיטליים, קופונים וחבילות." />
            <Module icon={<GraduationCap />} title="אקדמיה" desc="קורסים, פרקים, חידונים, תעודות ופודקאסטים." />
            <Module icon={<Users />} title="מוזיקאים מקצועיים" desc="הזמנת נגנים, מורים ומפיקים — עם יומן, חוזים והצעות מחיר." />
            <Module icon={<Music />} title="שורטס וידאו" desc="פיד וידאו אנכי בסגנון TikTok — תוכן ויראלי וגילוי כשרונות." />
            <Module icon={<TrendingUp />} title="מרקטפלייס יד-שנייה" desc="כלי נגינה משומשים עם דירוג AI, מערכת בקשות והתאמות." />
            <Module icon={<Sparkles />} title="כלי AI" desc="ניתוח אודיו, המרת קבצים, שיפור תיאורים ותוכן אוטומטי." />
            <Module icon={<Shield />} title="פאנל ניהול" desc="CRM, ניהול הזמנות, מודרציה, אנליטיקה ובקרת תכנים." />
          </div>
        </Section>

        {/* Business Model */}
        <Section icon={<DollarSign />} title="מודל הכנסות">
          <div className="grid md:grid-cols-2 gap-4">
            <Revenue title="עמלות מסחר" pct="10-15%" desc="עמלה מכל עסקה בחנות, מרקטפלייס והזמנת מוזיקאים." />
            <Revenue title="מנויי פרימיום" pct="חודשי/שנתי" desc="גישה לתכנים מתקדמים, כלי AI ללא הגבלה ויתרונות מועדון." />
            <Revenue title="קורסים בתשלום" pct="חד-פעמי" desc="הכנסה ישירה ממכירת קורסים, עם חלוקת רווחים למורים." />
            <Revenue title="מודעות ובאנרים" pct="CPM/CPC" desc="חסויות ממותגים ויצרני ציוד מוזיקלי." />
            <Revenue title="תוכנית שותפים" pct="עמלה" desc="מערכת אפיליאייט שמייצרת צמיחה ויראלית." />
            <Revenue title="שירותים לעסקים" pct="B2B" desc="חבילות לחנויות, מותגים ומוסדות מוזיקה." />
          </div>
        </Section>

        {/* Market */}
        <Section icon={<Globe />} title="שוק יעד">
          <div className="grid md:grid-cols-3 gap-4">
            <Metric label="TAM — שוק עולמי" value="$50B+" desc="תעשיית המוזיקה והחינוך המוזיקלי הגלובלית." />
            <Metric label="SAM — דובר עברית" value="$500M" desc="ישראל + קהילות יהודיות גדולות בחו״ל." />
            <Metric label="SOM — שנה 1-3" value="$10M" desc="חדירה ראלית לשוק המקומי." />
          </div>
          <div className="mt-6 p-6 rounded-2xl bg-muted/40 border border-border">
            <h4 className="font-semibold mb-2">קהלי יעד עיקריים</h4>
            <p className="text-muted-foreground">
              נגנים חובבים ומקצועיים · מורים פרטיים ומוסדות לימוד · תלמידי
              מוזיקה · מפיקי אירועים · חנויות ציוד · מותגים בתעשייה.
            </p>
          </div>
        </Section>

        {/* Competitive Advantage */}
        <Section icon={<Shield />} title="יתרון תחרותי">
          <div className="grid md:grid-cols-2 gap-4">
            <Advantage title="אקו-סיסטם סגור" desc="המשתמש לא צריך לעזוב — קונה, לומד, מוכר ומדבר באותו מקום." />
            <Advantage title="אפקט רשת" desc="ככל שיש יותר משתמשים — הערך לכל אחד גדל אקספוננציאלית." />
            <Advantage title="שפה ותרבות" desc="עברית מלאה, RTL מושלם, התאמה לקהל המקומי." />
            <Advantage title="טכנולוגיה מתקדמת" desc="AI מובנה, ביצועים גבוהים, ארכיטקטורה מודרנית וסקייל." />
          </div>
        </Section>

        {/* Roadmap */}
        <Section icon={<BarChart3 />} title="מפת דרכים">
          <div className="space-y-3">
            <Phase phase="Q1-Q2" title="השקה ציבורית" desc="פתיחת רישום, קמפיין שיווקי, חתימה על שותפים אסטרטגיים." />
            <Phase phase="Q3" title="גידול קהילה" desc="הגעה ל-10,000 משתמשים פעילים, השקת תוכנית אפיליאייט." />
            <Phase phase="Q4" title="הרחבת מסחר" desc="הוספת אמצעי תשלום, מותגים מובילים, גרסת מובייל." />
            <Phase phase="שנה 2" title="הרחבה בינלאומית" desc="פתיחת שפות נוספות, כניסה לקהילות יהודיות בחו״ל." />
          </div>
        </Section>

        {/* The Ask */}
        <section className="text-center space-y-6 py-12 px-6 rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20">
          <h2 className="text-3xl md:text-4xl font-bold">בואו לבנות איתנו את העתיד</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            אנחנו מחפשים שותפים אסטרטגיים שמאמינים בחזון של אקו-סיסטם מוזיקלי
            מאוחד. הפלטפורמה כבר חיה, פעילה וצומחת — זה הזמן הנכון להצטרף.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2 rounded-xl bg-background/60 backdrop-blur border border-border">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary [&>svg]:w-5 [&>svg]:h-5">{icon}</div>
        <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Card({ title, icon, tone, children }: { title: string; icon: React.ReactNode; tone: "primary" | "destructive"; children: React.ReactNode }) {
  const toneClass = tone === "primary" ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5";
  const iconClass = tone === "primary" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10";
  return (
    <div className={`p-6 rounded-2xl border ${toneClass} space-y-4`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconClass} [&>svg]:w-5 [&>svg]:h-5`}>{icon}</div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Module({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors space-y-2">
      <div className="text-primary [&>svg]:w-6 [&>svg]:h-6">{icon}</div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Revenue({ title, pct, desc }: { title: string; pct: string; desc: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-sm font-bold text-primary">{pct}</span>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Metric({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl border border-border bg-card text-center space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold text-primary">{value}</div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Advantage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card space-y-2">
      <h4 className="font-semibold flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" />
        {title}
      </h4>
      <p className="text-sm text-muted-foreground pr-4">{desc}</p>
    </div>
  );
}

function Phase({ phase, title, desc }: { phase: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border bg-card">
      <div className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-sm h-fit">{phase}</div>
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
