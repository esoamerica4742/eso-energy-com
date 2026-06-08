import { createFileRoute } from "@tanstack/react-router";
import { CommandCenterPage } from "@/components/access/CommandCenterPage";

export const Route = createFileRoute("/access")({
  component: AccessRoute,
  head: () => ({
    meta: [
      { title: "Command center · ESO Energy" },
      {
        name: "description",
        content: "Choose Eso Inverter Monitoring or Eso Pay Bills — then sign in or sign up.",
      },
    ],
  }),
});

function AccessRoute() {
  return <CommandCenterPage />;
}
