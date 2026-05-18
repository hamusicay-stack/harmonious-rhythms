import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Menu, X, LogOut, User as UserIcon, Shield, Command as CommandIcon, Globe, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import logoImg from "@/assets/logo.png";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { NotificationsBell } from "@/components/NotificationsBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { toast } from "sonner";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { cn } from "@/lib/utils";
import { UserBadges } from "@/components/UserBadges";

const navItems = [
  { to: "/shorts", label: "שורטס" },
  { to: "/forum", label: "פורום" },
  { to: "/shop", label: "חנות" },
  { to: "/beat", label: "BEAT" },
  { to: "/organ", label: "אורגן וירטואלי" },
  { to: "/academy", label: "אקדמיה" },
  { to: "/marketplace", label: "יד שנייה" },
  { to: "/pros", label: "מוזיקאים" },
  { to: "/news", label: "חדשות המוזיקה" },
  { to: "/wiki", label: "ויזיקאי" },
  { to: "/leaderboard", label: "לוח הישגים" },
  { to: "/tools", label: "כלים" },
  { to: "/about", label: "אודות" },
] as const;

interface Props {
  onCommandPalette?: () => void;
}

export function SiteHeader({ onCommandPalette }: Props = {}) {
  const [open, setOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { direction, scrollY } = useScrollDirection(80);

  useEffect(() => {
    if (!user) { setIsPro(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("music_pros")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!cancelled) setIsPro(!!data);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("סוף סשן");
    navigate({ to: "/" });
  };

  const initials = (profile?.display_name || user?.email || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hidden = false; // Always visible — sticky header per spec
  const elevated = scrollY > 8;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-transform duration-300 ease-out",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div
        className={cn(
          "border-b transition-all duration-300",
          elevated
            ? "glass-z3 border-white/40"
            : "border-transparent bg-background/40 backdrop-blur-md",
        )}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <Link to="/" className="group flex items-center" aria-label="המוזיקאי — דף הבית">
            <img
              src={logoImg}
              alt="המוזיקאי"
              className="h-9 w-auto transition-transform group-hover:scale-[1.03]"
            />
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground bg-white/55 shadow-soft" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-1.5 md:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCommandPalette}
              className="gap-2 rounded-full bg-white/40 px-3 text-muted-foreground hover:bg-white/70"
              aria-label="פלטת פקודות"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden text-xs lg:inline">חיפוש מהיר</span>
              <kbd className="hidden rounded border border-border/60 bg-white/60 px-1.5 py-0.5 text-[10px] font-medium lg:inline-flex">
                <CommandIcon className="h-2.5 w-2.5" />K
              </kbd>
            </Button>
            <CartDrawer />
            <NotificationsBell />
            <LanguageSwitcher />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full transition-transform hover:scale-105">
                    <Avatar className="h-9 w-9 border-2 border-white/60 shadow-soft">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-brand text-xs font-semibold text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-z3 border-white/40">
                  <DropdownMenuLabel className="text-right">
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <span>{profile?.display_name ?? "משתמש"}</span>
                      <UserBadges userId={user.id} />
                    </div>
                    <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/profile" })} className="cursor-pointer">
                    <UserIcon className="ml-2 h-4 w-4" />
                    הפרופיל שלי
                  </DropdownMenuItem>
                  {profile?.username && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/u/$username", params: { username: profile.username! } })} className="cursor-pointer">
                      <Globe className="ml-2 h-4 w-4" />
                      הפרופיל הציבורי שלי
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin" })} className="cursor-pointer">
                      <Shield className="ml-2 h-4 w-4 text-primary" />
                      ניהול המערכת
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="ml-2 h-4 w-4" />
                    סוף סשן
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="rounded-full">כנס לאולפן</Button>
                </Link>
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Button size="sm" className="rounded-full bg-brand text-white shadow-card hover:opacity-95">
                    הרשמה
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <NotificationsBell />
            <CartDrawer />
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(!open)}
              aria-label="תפריט"
              className="rounded-full"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="glass-z2 border-t border-white/40 md:hidden">
            <nav className="container mx-auto flex flex-col gap-1 px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-white/60 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-4">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full rounded-full">
                        <UserIcon className="ml-2 h-4 w-4" />
                        הפרופיל שלי
                      </Button>
                    </Link>
                    {profile?.username && (
                      <Link to="/u/$username" params={{ username: profile.username }} onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full rounded-full">
                          <Globe className="ml-2 h-4 w-4" />
                          הפרופיל הציבורי שלי
                        </Button>
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full rounded-full border-primary/40 text-primary">
                          <Shield className="ml-2 h-4 w-4" />
                          ניהול המערכת
                        </Button>
                      </Link>
                    )}
                    <Button onClick={() => { handleSignOut(); setOpen(false); }} variant="ghost" className="w-full rounded-full text-destructive">
                      <LogOut className="ml-2 h-4 w-4" />
                      סוף סשן
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      <Button variant="outline" className="w-full rounded-full">כנס לאולפן</Button>
                    </Link>
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      <Button className="w-full rounded-full bg-brand text-white">הרשמה</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
