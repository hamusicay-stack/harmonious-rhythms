import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ClipboardList, DollarSign, CheckCircle2, Building2,
  Package, ShieldCheck, ShoppingBag, Piano, Palette, Tags, Play,
  Music2, GraduationCap, Mail, Bot, Megaphone, MessagesSquare, Zap,
  Boxes, Scale, TicketPercent, Receipt, Activity, Upload, MessageSquareWarning, Crown,
  Newspaper, BookOpen, ShieldAlert, Sparkles, ChevronDown,
  Gauge, UsersRound, Handshake, HardDrive,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type NavItem = { to: string; title: string; icon: React.ComponentType<{ className?: string }> };
type Pillar = { id: string; label: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[] };

const PILLARS: Pillar[] = [
  {
    id: "dashboard",
    label: "📊 דשבורד מרכזי",
    icon: Gauge,
    items: [
      { to: "/admin/dashboard", title: "סקירה פיננסית", icon: LayoutDashboard },
      { to: "/admin/audit-log", title: "יומן ביקורת", icon: ShieldAlert },
      { to: "/admin/entitlements-control", title: "בקרת הרשאות", icon: ShieldCheck },
    ],
  },
  {
    id: "community",
    label: "👥 קהילה ו-CRM",
    icon: UsersRound,
    items: [
      { to: "/admin/users", title: "ניהול משתמשים", icon: Users },
      { to: "/admin/crm/customers", title: "לקוחות", icon: Users },
      { to: "/admin/crm/leads", title: "לידים", icon: ClipboardList },
      { to: "/admin/crm/deals", title: "קנבן עסקאות (רב-ערוצי)", icon: DollarSign },
      { to: "/admin/commerce/music-pros", title: "מודרציית אנשי מקצוע", icon: Music2 },
      { to: "/admin/crm/tasks", title: "משימות (קונטקסטואליות)", icon: CheckCircle2 },
      { to: "/admin/crm/admins", title: "מנהלי מערכת", icon: ShieldCheck },
    ],
  },
  {
    id: "content",
    label: "🎓 אקדמיה ותוכן",
    icon: GraduationCap,
    items: [
      { to: "/admin/commerce/academy", title: "קורסים ושיעורים", icon: GraduationCap },
      { to: "/admin/commerce/academy-analytics", title: "אנליטיקת אקדמיה", icon: Activity },
      { to: "/admin/forum", title: "פורום קהילתי", icon: MessagesSquare },
      { to: "/admin/commerce/shorts", title: "שורטס", icon: Play },
      { to: "/admin/commerce/news", title: "חדשות", icon: Newspaper },
      { to: "/admin/wiki", title: "ויקיפדיה AI", icon: BookOpen },
      { to: "/admin/content", title: "מנהל תוכן ותגיות", icon: BookOpen },
      { to: "/admin/content/pages", title: "דפי אתר (אודות/FAQ)", icon: BookOpen },
      { to: "/admin/commerce/newsletter", title: "ניוזלטר", icon: Mail },
      { to: "/admin/automations", title: "אוטומציות", icon: Zap },
      { to: "/admin/commerce/banners", title: "פרסומות", icon: Megaphone },
      { to: "/admin/notifications", title: "התראות ודיוור", icon: Mail },
      { to: "/admin/commerce/ai", title: "עוזרי AI", icon: Bot },
      { to: "/admin/moderation", title: "דיווחים ומודרציה", icon: ShieldAlert },
      { to: "/admin/chat-oversight", title: "פיקוח צ'אטים", icon: MessageSquareWarning },
    ],
  },
  {
    id: "commerce",
    label: "🛍️ מסחר, מלאי ופיננסים",
    icon: ShoppingBag,
    items: [
      { to: "/admin/commerce/shop", title: "חנות", icon: ShoppingBag },
      { to: "/admin/commerce/orders", title: "הזמנות (חסימת גישה בהחזר)", icon: Receipt },
      { to: "/admin/commerce/marketplace", title: "יד 2", icon: Tags },
      { to: "/admin/commerce/beat", title: "BEAT", icon: Piano },
      { to: "/admin/commerce/organ-ui", title: "עיצוב אורגן", icon: Palette },
      { to: "/admin/commerce/cpi", title: "CPI אוטומציה", icon: Upload },
      { to: "/admin/crm/suppliers", title: "ניהול ספקים", icon: Building2 },
      { to: "/admin/crm/purchase-orders", title: "הזמנות רכש", icon: Package },
      { to: "/admin/commerce/global-economy", title: "כלכלה גלובלית (Wallet)", icon: Crown },
      { to: "/admin/commerce/coupons", title: "קופונים", icon: TicketPercent },
      { to: "/admin/commerce/business-rules", title: "מטריצת VIP × מוצר", icon: Scale },
      { to: "/admin/commerce/product-types", title: "סוגי מוצרים", icon: Boxes },
      { to: "/admin/commerce/storage-explorer", title: "סייר אחסון (יתומים)", icon: HardDrive },
    ],
  },
  {
    id: "affiliates",
    label: "🤝 מערך השותפים",
    icon: Handshake,
    items: [
      { to: "/admin/commerce/affiliates", title: "בקשות, המרות ותשלומים", icon: Sparkles },
    ],
  },
];

function PillarGroup({ pillar, currentPath, defaultOpen }: { pillar: Pillar; currentPath: string; defaultOpen: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [open, setOpen] = useState(defaultOpen);
  const Icon = pillar.icon;

  if (collapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {pillar.items.map((item) => {
              const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
              const ItemIcon = item.icon;
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                    <Link to={item.to}><ItemIcon className="h-4 w-4 shrink-0" /></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup className="py-1">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            className="group/label flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 text-[12px] font-bold tracking-tight text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <span className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              {pillar.label}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-hidden">
          <SidebarGroupContent className="mt-1 border-e border-sidebar-border pe-1">
            <SidebarMenu>
              {pillar.items.map((item) => {
                const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
                const ItemIcon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="text-[13px]"
                    >
                      <Link to={item.to} className="flex items-center gap-2">
                        <ItemIcon className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-primary" : "text-muted-foreground")} />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AdminSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon" side="right" className="border-s border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <div className="font-display text-sm font-bold text-sidebar-foreground">
            חדר הבקרה
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {PILLARS.map((p) => {
          const isInPillar = p.items.some((i) => currentPath === i.to || currentPath.startsWith(i.to + "/"));
          return (
            <PillarGroup key={p.id} pillar={p} currentPath={currentPath} defaultOpen={isInPillar || p.id === "dashboard"} />
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
