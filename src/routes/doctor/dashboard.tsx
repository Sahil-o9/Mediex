import { createFileRoute } from "@tanstack/react-router";
import DoctorDashboardPage from "@/pages/DoctorDashboardPage";
import { RequireDoctor } from "@/components/RequirePatient";

export const Route = createFileRoute("/doctor/dashboard")({
  head: () => ({
    meta: [
      { title: "Clinical Workspace | Mediex" },
      {
        name: "description",
        content:
          "Doctor workspace showing prepared patient histories and demo consultation queue in Mediex.",
      },
      { property: "og:title", content: "Clinical Workspace | Mediex" },
      {
        property: "og:description",
        content: "Prepared patient histories for faster consultations.",
      },
    ],
  }),
  component: () => (
    <RequireDoctor>
      <DoctorDashboardPage />
    </RequireDoctor>
  ),
});
