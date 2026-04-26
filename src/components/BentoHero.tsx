import { Link } from "@tanstack/react-router";
import { MessageSquare, ShoppingBag, GraduationCap, Tags, Sparkles, Play, Crown, ArrowLeft, Command } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";
import { useUISounds } from "@/hooks/useUISounds";
import { useEffect, useState, MouseEvent } from "react";

const HERO_TAGLINES = [
  "הפלטפורמה החדשה למוזיקאים",
  "סטודיו פתוח 24/7 — תכנס תנגן",
  "יוצרים, מפיקים ומורים — במקום אחד",
];

interface BentoHeroProps {
  onOpenCommand?: () => void;
}

export function BentoHero({ onOpenCommand }: BentoHeroProps) {
  const { play } = useUISounds();
  const [tagline, setTagline] = useState<string>("");

  useEffect(() => {
    setTagline(HERO_TAGLINES[Math.floor(Math.random() * HERO_TAGLINES.length)]);
  }, []);

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>) => {
    play("click", { x: e.clientX, velocity: 0.5 });
  };

  return (
    <section className="relative">
      <div className="container mx-auto px-4 py-12 md:px-8 md:py-20">
        {/* Tagline pill */}
        <div className="mb-8 flex justify-center">
          <div className="glass-z1 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-foreground/80">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {tagline || "הפלטפורמה החדשה למוזיקאים"}
          </div>
        </div>

        {/* Bento Grid: 6-col responsive */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[minmax(160px,auto)]">
          {/* Hero headline - spans 4 */}
          <GlassCard level="z3" parallax className="md:col-span-4 md:row-span-2 p-8 md:p-12">
            <h1 className="font-display text-4xl font-bold leading-[1.05] md:text-6xl lg:text-7xl">
              כל מה שמוזיקאי צריך
              <br />
              <span className="text-gradient-brand">במקום אחד.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              פורום מקצועי, חנות, אקדמיה ולוח יד שנייה — מתחת לקורת גג אחת מעוצבת ומוקפדת.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <Link to="/auth" onClick={handleNavClick}>
                <Button size="lg" className="bg-brand text-primary-foreground shadow-card hover:opacity-90">
                  הצטרפו עכשיו <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </Link>
              <button
                onClick={() => { play("open", { velocity: 0.6 }); onOpenCommand?.(); }}
                className="glass-z1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-foreground/80 transition-smooth hover:text-foreground"
              >
                <Command className="h-4 w-4" /> חיפוש מהיר
                <kbd className="ml-2 rounded bg-foreground/10 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
              </button>
            </div>
          </GlassCard>

          {/* Forum - spans 2 */}
          <Link to="/forum" onClick={handleNavClick} className="md:col-span-2 block">
            <GlassCard level="z2" interactive parallax className="h-full p-6">
              <MessageSquare className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-display text-xl font-semibold">פורום</h3>
              <p className="mt-1 text-sm text-muted-foreground">דיונים ושאלות בין מוזיקאים.</p>
            </GlassCard>
          </Link>

          {/* Shop - spans 2 */}
          <Link to="/shop" onClick={handleNavClick} className="md:col-span-2 block">
            <GlassCard level="z2" interactive parallax className="h-full p-6">
              <ShoppingBag className="h-8 w-8 text-primary-glow" />
              <h3 className="mt-4 font-display text-xl font-semibold">חנות</h3>
              <p className="mt-1 text-sm text-muted-foreground">סאמפלים, פלאגינים וציוד.</p>
            </GlassCard>
          </Link>

          {/* Academy - spans 2 */}
          <Link to="/academy" onClick={handleNavClick} className="md:col-span-2 block">
            <GlassCard level="z2" interactive parallax className="h-full p-6">
              <GraduationCap className="h-8 w-8 text-accent" />
              <h3 className="mt-4 font-display text-xl font-semibold">אקדמיה</h3>
              <p className="mt-1 text-sm text-muted-foreground">קורסים ומאסטרקלאסים.</p>
            </GlassCard>
          </Link>

          {/* Marketplace - spans 2 */}
          <Link to="/marketplace" onClick={handleNavClick} className="md:col-span-2 block">
            <GlassCard level="z2" interactive parallax className="h-full p-6">
              <Tags className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-display text-xl font-semibold">יד שנייה</h3>
              <p className="mt-1 text-sm text-muted-foreground">כלי נגינה במחירים נוחים.</p>
            </GlassCard>
          </Link>

          {/* Shorts CTA - spans 2 */}
          <Link to="/shorts" onClick={handleNavClick} className="md:col-span-2 block">
            <GlassCard level="z2" interactive parallax className="h-full p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand">
                <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                <Crown className="h-3 w-3" /> חדש
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold">שורטס</h3>
              <p className="mt-1 text-sm text-muted-foreground">סרטונים אנכיים וביטים.</p>
            </GlassCard>
          </Link>
        </div>
      </div>
    </section>
  );
}
