import { createFileRoute } from "@tanstack/react-router";
import WelcomePage from "@/pages/WelcomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mediex — AI Clinical History Assistant" },
      {
        name: "description",
        content:
          "Start at the Mediex kiosk: register as a patient for AI health guidance, report analysis and appointments, or sign in as a doctor.",
      },
      { property: "og:title", content: "Mediex — AI Clinical History Assistant" },
      {
        property: "og:description",
        content: "Patient and doctor entry point for the Mediex healthcare platform demo.",
      },
    ],
  }),
  component: WelcomePage,
});
