import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — command center handles sign-up product selection. */
export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    throw redirect({ to: "/access" });
  },
  component: () => null,
});
