import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { Boxes, Scale, Users, Zap, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/admin1")({
  beforeLoad: async ({ location }) => {
    // Skip auth check during SSR — session lives in browser localStorage
    if (typeof window === "undefined") return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } as never });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Admin1 — מנוע ניהול אוניברסלי" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Admin1Layout,
});

type NavItem = { to: string; label: string; icon: typeof Boxes; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin1", label: "סקירה", icon: LayoutDashboard, exact: true },
  { to: "/admin1/product-types", label: "סוגי מוצרים", icon: Boxes },
  { to: "/admin1/business-rules", label: "כללי עסק גלובליים", icon: Scale },
  { to: "/admin1/crm", label: "CRM 360", icon: Users },
  { to: "/admin1/automations", label: "אוטומציות", icon: Zap },
];

function Admin1Layout() {
  return (
    <SiteLayout>
      <div dir="rtl" className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">מנוע ניהול אוניברסלי</h1>
          <p className="text-sm text-muted-foreground">סביבת ניהול חדשה ומבודדת — לא משפיעה על /admin הקיים.</p>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <nav className="flex md:flex-col gap-1 overflow-x-auto rounded-lg border border-border bg-card p-2">
              {NAV.map(({ to, label, icon: Icon, exact }) => (
                <Link
                  key={to}
                  to={to as never}
                  activeOptions={{ exact: !!exact }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition"
                  activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-primary text-primary-foreground" }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              ))}
            </nav>
          </aside>
          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            <Outlet />
          </main>
        </div>
      </div>
    </SiteLayout>
  );
}
