import { createFileRoute } from "@tanstack/react-router";
import DoctorRegisterPage from "@/pages/DoctorRegisterPage";

export const Route = createFileRoute("/doctor/register")({
  head: () => ({
    meta: [
      { title: "Doctor Registration | Mediex" },
      {
        name: "description",
        content: "Create a doctor account and submit your professional profile for verification.",
      },
    ],
  }),
  component: DoctorRegisterPage,
});
