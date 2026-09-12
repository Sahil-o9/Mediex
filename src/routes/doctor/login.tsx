import { createFileRoute } from "@tanstack/react-router";
import DoctorLoginPage from "@/pages/DoctorLoginPage";

export const Route = createFileRoute("/doctor/login")({
  head: () => ({
    meta: [
      { title: "Doctor Sign In | Mediex" },
      {
        name: "description",
        content:
          "Clinician sign in for the Mediex workspace, where patient histories are reviewed before consultation.",
      },
      { property: "og:title", content: "Doctor Sign In | Mediex" },
      {
        property: "og:description",
        content: "Access the Mediex clinical workspace.",
      },
    ],
  }),
  component: DoctorLoginPage,
});
