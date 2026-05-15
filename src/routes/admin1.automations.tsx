import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutomationsManager } from "@/components/admin/AutomationsManager";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/admin1/automations")({
  component: AutomationsPage,
});

function AutomationsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>אוטומציות — Smart Routing</CardTitle>
          <Badge className="bg-green-600">WhatsApp → Email Fallback</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          המערכת בודקת את <code>profiles.has_whatsapp</code>: אם TRUE — שליחה דרך WhatsApp; אחרת — Email.
          מקור האמת לדרגת VIP הוא <code>global_subscription_tier_id</code>.
        </CardContent>
      </Card>
      <AutomationsManager />
    </div>
  );
}
