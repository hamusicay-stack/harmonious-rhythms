import { createFileRoute } from "@tanstack/react-router";
import { DealsKanban } from "@/components/admin/DealsKanban";

export const Route = createFileRoute("/admin/crm/deals")({
  component: () => <DealsKanban />,
});
