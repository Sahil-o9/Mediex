import { createFileRoute } from "@tanstack/react-router";
import PatientAuthPage from "@/pages/PatientAuthPage";

export const Route = createFileRoute("/patient/auth")({
  head: () => ({
    meta: [
      { title: "Patient Login & Registration | Mediex" },
      {
        name: "description",
        content:
          "Log in with your mobile number or register in four quick steps to get your Mediex patient ID.",
      },
      { property: "og:title", content: "Patient Login & Registration | Mediex" },
      {
        property: "og:description",
        content: "Secure patient sign in and guided registration for Mediex.",
      },
    ],
  }),
  component: PatientAuthPage,
});
