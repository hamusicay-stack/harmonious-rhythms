import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/forum/user/$username")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/u/$username", params: { username: params.username }, replace: true });
  },
  component: () => null,
});
