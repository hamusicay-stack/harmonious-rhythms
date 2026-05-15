import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, Scale, Users, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin1/")({
  component: Admin1Index,
});

const TILES = [
  { to: "/admin1/product-types", title: "סוגי מוצרים", desc: "הגדר טיפוסים ושדות מטא-נתונים דינמיים", icon: Boxes },
  { to: "/admin1/business-rules", title: "כללי עסק גלובליים", desc: "מטריצת VIP × סוג מוצר", icon: Scale },
  { to: "/admin1/crm", title: "CRM 360", desc: "תצוגת לקוח עם סנכרון חומרה", icon: Users },
  { to: "/admin1/automations", title: "אוטומציות", desc: "WhatsApp / Email Smart Routing", icon: Zap },
];

function Admin1Index() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {TILES.map(({ to, title, desc, icon: Icon }) => (
        <Link key={to} to={to as never} className="block">
          <Card className="hover:border-primary transition">
            <CardHeader className="flex flex-row items-center gap-3">
              <Icon className="h-6 w-6 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
