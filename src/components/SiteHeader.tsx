import { Link } from "@tanstack/react-router";
import { Music2, Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/forum", label: "פורום" },
  { to: "/store", label: "חנות" },
  { to: "/academy", label: "אקדמיה" },
  { to: "/marketplace", label: "יד שנייה" },
  { to: "/about", label: "אודות" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2 transition-smooth hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-gold">
            <Music2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            המוזיק<span className="text-gradient-gold">אי</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="icon" aria-label="חיפוש">
            <Search className="h-4 w-4" />
          </Button>
          <Link to="/auth">
            <Button variant="ghost" size="sm">התחברות</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold hover:opacity-90">
              הרשמה
            </Button>
          </Link>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="תפריט"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="border-t border-border/40 bg-background md:hidden">
          <nav className="container mx-auto flex flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-4">
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">התחברות</Button>
              </Link>
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                  הרשמה
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
