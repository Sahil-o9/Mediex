import { createFileRoute } from "@tanstack/react-router";
import WelcomePage from "@/pages/WelcomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mediex — Patient & Doctor Portal" },
      {
        name: "description",
        content:
          "Explore the Mediex patient and doctor demo: share health concerns, find care, and prepare for a visit.",
      },
      { property: "og:title", content: "Mediex — Patient & Doctor Portal" },
      {
        property: "og:description",
        content: "Patient and doctor entry point for the Mediex healthcare platform demo.",
      },
    ],
  }),
  component: WelcomePage,
});
