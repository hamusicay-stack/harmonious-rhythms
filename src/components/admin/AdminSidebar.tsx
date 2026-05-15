import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ClipboardList, DollarSign, CheckCircle2, Building2,
  Package, KeyRound, ShieldCheck, ShoppingBag, Piano, Palette, Tags, Play,
  Music2, GraduationCap, Sparkles, Mail, Bot, Megaphone, MessagesSquare, Zap,
  Boxes, Scale, TicketPercent,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { to: string; title: string; icon: React.ComponentType<{ className?: string }> };

const MAIN: NavItem[] = [
  { to: "/admin/dashboard", title: "דשבורד", icon: LayoutDashboard },
  { to: "/admin/forum", title: "פורום וקהילה", icon: MessagesSquare },
  { to: "/admin/automations", title: "אוטומציות", icon: Zap },
];

const CRM: NavItem[] = [
  { to: "/admin/crm/customers", title: "לקוחות", icon: Users },
  { to: "/admin/crm/leads", title: "לידים", icon: ClipboardList },
  { to: "/admin/crm/deals", title: "עסקאות", icon: DollarSign },
  { to: "/admin/crm/tasks", title: "משימות", icon: CheckCircle2 },
  { to: "/admin/crm/suppliers", title: "ספקים", icon: Building2 },
  { to: "/admin/crm/purchase-orders", title: "רכש", icon: Package },
  { to: "/admin/crm/roles", title: "הרשאות", icon: KeyRound },
  { to: "/admin/crm/admins", title: "מנהלים", icon: ShieldCheck },
];

const COMMERCE: NavItem[] = [
  { to: "/admin/commerce/product-types", title: "סוגי מוצרים", icon: Boxes },
  { to: "/admin/commerce/business-rules", title: "כללי VIP × מוצר", icon: Scale },
  { to: "/admin/commerce/shop", title: "חנות", icon: ShoppingBag },
  { to: "/admin/commerce/beat", title: "BEAT", icon: Piano },
  { to: "/admin/commerce/organ-ui", title: "עיצוב אורגן", icon: Palette },
  { to: "/admin/commerce/marketplace", title: "יד 2", icon: Tags },
  { to: "/admin/commerce/shorts", title: "שורטס", icon: Play },
  { to: "/admin/commerce/music-pros", title: "מוזיקאים", icon: Music2 },
  { to: "/admin/commerce/academy", title: "אקדמיה", icon: GraduationCap },
  { to: "/admin/commerce/affiliates", title: "שותפים", icon: Sparkles },
  { to: "/admin/commerce/newsletter", title: "ניוזלטר", icon: Mail },
  { to: "/admin/commerce/ai", title: "עוזרי AI", icon: Bot },
  { to: "/admin/commerce/banners", title: "פרסומות", icon: Megaphone },
];

function NavGroup({ label, items, currentPath }: { label: string; items: NavItem[]; currentPath: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link to={item.to} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarHeader className="border-b border-border/40 px-4 py-3">
        <div className="font-display text-sm font-bold">חדר הבקרה</div>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="ראשי" items={MAIN} currentPath={currentPath} />
        <NavGroup label="CRM" items={CRM} currentPath={currentPath} />
        <NavGroup label="חנות ושיווק" items={COMMERCE} currentPath={currentPath} />
      </SidebarContent>
    </Sidebar>
  );
}
