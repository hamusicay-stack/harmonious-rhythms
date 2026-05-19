import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { MyPointsTab } from "@/components/dashboard/MyPointsTab";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/points")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: PointsHistoryPage,
  head: () => ({
    meta: [
      { title: "הנקודות שלי | היסטוריה" },
      { name: "description", content: "מעקב יתרת הנקודות והיסטוריית הצבירה והמימוש." },
    ],
  }),
});

function PointsHistoryPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">הנקודות שלי</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            יתרה עדכנית, היסטוריית צבירה ומימוש בחנות.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/profile">
            <ArrowRight className="h-4 w-4" />
            לפרופיל
          </Link>
        </Button>
      </div>

      <MyPointsTab userId={user.id} />
    </div>
  );
}
