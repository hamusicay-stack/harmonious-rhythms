import { Link } from "@tanstack/react-router";
import { Music2, Facebook, Instagram, Youtube } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-card/40">
      <div className="container mx-auto grid grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:px-8">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Music2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">המוזיקאי</span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            הפלטפורמה המובילה למוזיקאים בישראל ובעולם.
          </p>
          <div className="mt-4 flex gap-3">
            <a href="#" className="text-muted-foreground hover:text-primary transition-smooth"><Facebook className="h-5 w-5" /></a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-smooth"><Instagram className="h-5 w-5" /></a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-smooth"><Youtube className="h-5 w-5" /></a>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">מודולים</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/forum" className="hover:text-primary transition-smooth">פורום</Link></li>
            <li><Link to="/store" className="hover:text-primary transition-smooth">חנות</Link></li>
            <li><Link to="/academy" className="hover:text-primary transition-smooth">אקדמיה</Link></li>
            <li><Link to="/marketplace" className="hover:text-primary transition-smooth">יד שנייה</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">חברה</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary transition-smooth">אודות</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-smooth">צור קשר</Link></li>
            <li><a href="#" className="hover:text-primary transition-smooth">תנאי שימוש</a></li>
            <li><a href="#" className="hover:text-primary transition-smooth">מדיניות פרטיות</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">חשבון</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-primary transition-smooth">התחברות</Link></li>
            <li><Link to="/auth" className="hover:text-primary transition-smooth">הרשמה</Link></li>
            <li><Link to="/profile" className="hover:text-primary transition-smooth">פרופיל</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/40">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground md:px-8">
          © {new Date().getFullYear()} המוזיקאי — כל הזכויות שמורות.
        </div>
      </div>
    </footer>
  );
}
