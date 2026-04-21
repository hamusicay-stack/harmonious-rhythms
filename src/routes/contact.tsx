import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { ModulePlaceholder } from "@/components/ModulePlaceholder";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "צור קשר — המוזיקאי" },
      { name: "description", content: "נשמח לשמוע מכם — שאלות, הצעות ושיתופי פעולה." },
      { property: "og:title", content: "צור קשר — המוזיקאי" },
      { property: "og:description", content: "נשמח לשמוע מכם — שאלות, הצעות ושיתופי פעולה." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <ModulePlaceholder icon={Mail} title="צרו קשר" subtitle="נשמח לשמוע מכם.">
      <form className="mx-auto max-w-lg space-y-4">
        <Input placeholder="שם מלא" />
        <Input type="email" placeholder="כתובת מייל" />
        <Textarea placeholder="ההודעה שלכם..." rows={6} />
        <Button className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-gold">
          שליחה
        </Button>
      </form>
    </ModulePlaceholder>
  );
}
