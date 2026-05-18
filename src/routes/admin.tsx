import { requireAdmin } from "@/lib/routeGuards";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireAdmin,
  head: () => ({
    meta: [
      { title: "ניהול המערכת — המוזיקאי" },
      { name: "description", content: "לוח בקרה למנהלי המוזיקאי." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <h1 className="font-display text-3xl font-bold">גישה נדחתה</h1>
          <p className="text-muted-foreground">אזור זה מיועד למנהלי המערכת בלבד.</p>
          <Button onClick={() => navigate({ to: "/" })}>חזרה לדף הבית</Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-[calc(100vh-4rem)] w-full text-right">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur px-4">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground">חדר הבקרה של המוזיקאי</span>
            </header>
            <main className="flex-1 px-4 py-6 md:px-8">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </SiteLayout>
  );
}
