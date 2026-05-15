import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/commerce/")({
  beforeLoad: () => { throw redirect({ to: "/admin/commerce/shop" }); },
});
