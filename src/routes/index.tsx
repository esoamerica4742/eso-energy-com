import { createFileRoute } from "@tanstack/react-router";
import SovereignLandingPage from "@/app/page";

export const Route = createFileRoute("/")({
  component: SovereignLandingPage,
  head: () => ({
    meta: [
      { title: "Eso Energy · Sovereign Infrastructure" },
      {
        name: "description",
        content:
          "Orchestrate solar, grid, and fuel assets in one place — built for African enterprises.",
      },
    ],
  }),
});
