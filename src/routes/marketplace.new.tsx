import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ListingFormWizard } from "@/components/marketplace/ListingFormWizard";

export const Route = createFileRoute("/marketplace/new")({
  head: () => ({ meta: [{ title: "פרסם מודעה — המוזיקאי" }] }),
  component: NewListingPage,
});

function NewListingPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <ModulePlaceholder icon={Plus} title="טוען..." subtitle="" />;
  if (!user) return (
    <ModulePlaceholder icon={Plus} title="פרסם מודעה" subtitle="יש להתחבר כדי לפרסם מודעה">
      <div className="max-w-md mx-auto text-center space-y-4 py-8">
        <p className="text-muted-foreground">כדי לפרסם מודעה בלוח יד 2 צריך להתחבר תחילה (חינם, לוקח שניה).</p>
        <Link to="/auth"><Button size="lg">התחבר / הירשם</Button></Link>
      </div>
    </ModulePlaceholder>
  );

  return (
    <ModulePlaceholder icon={Plus} title="פרסם מודעה" subtitle="">
      <ListingFormWizard mode="create" />
    </ModulePlaceholder>
  );
}
