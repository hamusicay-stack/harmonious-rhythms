import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import {
  Home, MessageSquare, ShoppingBag, GraduationCap, Tags,
  Users, Music2, User as UserIcon, Search, Sparkles, Bell, Headphones,
  BookOpen, Package, Store as StoreIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
  hint?: string;
}

interface SearchResult {
  id: string;
  label: string;
  to: string;
  category: "אקדמיה" | "חנות" | "יד שנייה" | "מוזיקאים";
  icon: React.ElementType;
}

const NAV: NavItem[] = [
  { icon: Home, label: "דף הבית", to: "/", hint: "G H" },
  { icon: GraduationCap, label: "אקדמיה", to: "/academy", hint: "G A" },
  { icon: ShoppingBag, label: "חנות", to: "/shop", hint: "G S" },
  { icon: MessageSquare, label: "פורום", to: "/forum", hint: "G F" },
  { icon: Tags, label: "יד שנייה", to: "/marketplace", hint: "G M" },
  { icon: Users, label: "מוזיקאים", to: "/pros", hint: "G P" },
  { icon: Music2, label: "שורטס", to: "/shorts", hint: "G V" },
  { icon: Headphones, label: "פודקאסטים", to: "/academy/podcasts" },
  { icon: UserIcon, label: "הפרופיל שלי", to: "/profile" },
  { icon: Bell, label: "התראות", to: "/profile" },
];

export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); }
  }, [open]);

  // Real-time search across content (debounced)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const like = `%${q}%`;
        const [courses, products, listings, pros] = await Promise.all([
          supabase.from("academy_courses").select("id, slug, title").ilike("title", like).limit(5),
          supabase.from("shop_products").select("id, slug, name").ilike("name", like).limit(5),
          supabase.from("marketplace_listings").select("id, title").ilike("title", like).limit(5),
          supabase.from("music_pros").select("id, display_name").ilike("display_name", like).limit(5),
        ]);
        if (cancelled) return;
        const out: SearchResult[] = [];
        (courses.data ?? []).forEach((c: any) => out.push({
          id: `c-${c.id}`, label: c.title, to: `/academy/${c.slug}`, category: "אקדמיה", icon: BookOpen,
        }));
        (products.data ?? []).forEach((p: any) => out.push({
          id: `p-${p.id}`, label: p.name, to: `/shop/${p.slug}`, category: "חנות", icon: Package,
        }));
        (listings.data ?? []).forEach((l: any) => out.push({
          id: `l-${l.id}`, label: l.title, to: `/marketplace/${l.id}`, category: "יד שנייה", icon: StoreIcon,
        }));
        (pros.data ?? []).forEach((pr: any) => out.push({
          id: `pr-${pr.id}`, label: pr.display_name, to: `/pros/${pr.id}`, category: "מוזיקאים", icon: Users,
        }));
        setResults(out);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-z3 glass-noise max-w-xl gap-0 border-white/40 p-0 shadow-elevated [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">פלטת פקודות</DialogTitle>
        <Command
          label="פלטת פקודות"
          className="[&_[cmdk-input]]:w-full [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-5 [&_[cmdk-input]]:py-4 [&_[cmdk-input]]:text-base [&_[cmdk-input]]:outline-none"
          loop
          shouldFilter={false}
        >
          <div className="flex items-center gap-3 border-b border-white/30 px-5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="חפש קורסים, מוצרים, מודעות, מוזיקאים... (Cmd+K)"
              autoFocus
            />
            {searching && <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />}
            <kbd className="rounded-md border border-white/40 bg-white/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {query.trim().length >= 2 && !searching ? "שקט באולפן — אין תוצאות" : "התחל להקליד כדי לחפש..."}
            </Command.Empty>

            {/* Live content results */}
            {Object.entries(grouped).map(([cat, items]) => (
              <Command.Group
                key={cat}
                heading={cat}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {items.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={r.id}
                    onSelect={() => go(r.to)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors aria-selected:bg-white/60 aria-selected:shadow-soft"
                  >
                    <r.icon className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{r.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            {/* Static navigation always shown */}
            <Command.Group
              heading="ניווט"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {NAV.filter((item) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return item.label.toLowerCase().includes(q);
              }).map((item) => (
                <Command.Item
                  key={item.to + item.label}
                  value={`nav-${item.to}-${item.label}`}
                  onSelect={() => go(item.to)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors aria-selected:bg-white/60 aria-selected:shadow-soft"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="flex-1">{item.label}</span>
                  {item.hint && (
                    <kbd className="rounded border border-white/40 bg-white/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {item.hint}
                    </kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            {!query.trim() && (
              <Command.Group
                heading="פעולות מהירות"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                <Command.Item
                  value="action-upload-short"
                  onSelect={() => go("/shorts")}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors aria-selected:bg-white/60"
                >
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>העלה שורט חדש</span>
                </Command.Item>
                <Command.Item
                  value="action-forum-post"
                  onSelect={() => go("/forum")}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors aria-selected:bg-white/60"
                >
                  <MessageSquare className="h-4 w-4 text-accent" />
                  <span>פוסט חדש בפורום</span>
                </Command.Item>
                <Command.Item
                  value="action-marketplace-new"
                  onSelect={() => go("/marketplace/new")}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors aria-selected:bg-white/60"
                >
                  <Tags className="h-4 w-4 text-accent" />
                  <span>פרסם מודעת יד שנייה</span>
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center justify-between gap-3 border-t border-white/30 bg-white/30 px-4 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="rounded border border-white/40 bg-white/50 px-1.5 py-0.5">↑↓</kbd>
              ניווט
              <kbd className="rounded border border-white/40 bg-white/50 px-1.5 py-0.5">↵</kbd>
              בחר
            </div>
            <div className="flex items-center gap-1.5">
              <Music2 className="h-3 w-3" />
              <span>המוזיקאי</span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
