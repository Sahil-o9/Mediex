import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquareHeart,
  FileText,
  Hospital,
  CalendarCheck,
  Siren,
  HeartPulse,
  Activity,
  Droplets,
  Phone,
  ArrowRight,
  CalendarClock,
  Clock,
} from "lucide-react";
import { Link } from "@/lib/router";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { getAppointments, getReports, getChatMessages } from "@/lib/mediex/storage";
import { useLanguage } from "@/context/LanguageContext";
import type { Appointment, Patient } from "@/types";

export const Route = createFileRoute("/patient/home")({
  head: () => ({
    meta: [
      { title: "Patient Dashboard | Mediex" },
      {
        name: "description",
        content:
          "Your Mediex dashboard: health summary, upcoming appointment, recent activity and quick access to every care feature.",
      },
      { property: "og:title", content: "Patient Dashboard | Mediex" },
      {
        property: "og:description",
        content: "Health summary, appointments and quick actions in one place.",
      },
    ],
  }),
  component: () => <RequirePatient>{(patient) => <Dashboard patient={patient} />}</RequirePatient>,
});

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function Dashboard({ patient }: { patient: Patient }) {
  const { t, format } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    setAppointments(getAppointments(patient.patientId));
    setReportCount(getReports(patient.patientId).length);
    setChatCount(getChatMessages(patient.patientId).filter((m) => m.role === "user").length);
  }, [patient.patientId]);

  const upcoming = appointments[0];
  const age = calculateAge(patient.dateOfBirth);

  const quickActions: {
    to: string;
    label: string;
    description: string;
    icon: typeof MessageSquareHeart;
  }[] = [
    {
      to: "/patient/assistant",
      label: t.dashboard.qaAssistant,
      description: t.dashboard.qaAssistantDesc,
      icon: MessageSquareHeart,
    },
    {
      to: "/patient/reports",
      label: t.dashboard.qaReports,
      description: t.dashboard.qaReportsDesc,
      icon: FileText,
    },
    {
      to: "/patient/hospitals",
      label: t.dashboard.qaHospitals,
      description: t.dashboard.qaHospitalsDesc,
      icon: Hospital,
    },
    {
      to: "/patient/appointments",
      label: t.dashboard.qaAppointments,
      description: t.dashboard.qaAppointmentsDesc,
      icon: CalendarCheck,
    },
    {
      to: "/patient/emergency",
      label: t.dashboard.qaEmergency,
      description: t.dashboard.qaEmergencyDesc,
      icon: Siren,
    },
  ];

  const summary = [
    { icon: HeartPulse, label: t.dashboard.patientId, value: patient.patientId },
    {
      icon: Activity,
      label: t.dashboard.age,
      value: age !== null ? format(t.dashboard.ageYears, { years: age }) : t.dashboard.addDob,
    },
    {
      icon: Droplets,
      label: t.dashboard.bloodGroup,
      value: patient.bloodGroup || t.common.notAdded,
    },
    {
      icon: Phone,
      label: t.dashboard.emergencyContact,
      value: patient.emergencyContact || t.common.notAdded,
    },
  ];

  const activity = [
    { label: t.dashboard.activityAppointments, value: appointments.length },
    { label: t.dashboard.activityReports, value: reportCount },
    { label: t.dashboard.activityQuestions, value: chatCount },
  ];

  return (
    <PatientShell
      title={format(t.dashboard.greeting, {
        name: patient.fullName.split(" ")[0] ?? patient.fullName,
      })}
      subtitle={t.dashboard.subtitle}
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-6"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              {t.dashboard.healthSummary}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {summary.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-100 text-medical-700">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-400">{label}</p>
                    <p className="truncate text-sm font-semibold text-slate-700">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/patient/profile"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-medical-700 hover:gap-2.5"
            >
              {t.dashboard.completeProfile}
              <ArrowRight size={16} />
            </Link>
          </motion.section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              {t.dashboard.quickActions}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map(({ to, label, description, icon: Icon }, i) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link
                    to={to}
                    className="group flex h-full items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-medical-100"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-medical-500 to-medical-700 text-white shadow-sm shadow-medical-500/30">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{label}</p>
                      <p className="text-sm text-slate-500">{description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-medical-600 to-medical-800 p-5 text-white shadow-lg shadow-medical-500/25 md:p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-medical-100">
              <CalendarClock size={18} />
              {t.dashboard.upcomingAppointment}
            </div>
            {upcoming ? (
              <div className="mt-4 space-y-1">
                <p className="text-xl font-bold">{upcoming.doctorName}</p>
                <p className="text-medical-100">{upcoming.specialty}</p>
                <p className="text-sm text-medical-100">{upcoming.hospitalName}</p>
                <div className="mt-4 flex items-center gap-4 text-sm font-semibold">
                  <span className="rounded-full bg-white/15 px-3 py-1">{upcoming.date}</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                    <Clock size={14} />
                    {upcoming.time}
                  </span>
                </div>
                <Link
                  to="/patient/appointments"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-medical-700"
                >
                  {t.dashboard.viewAllAppointments}
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-medical-50">{t.dashboard.noAppointment}</p>
                <Link
                  to="/patient/hospitals"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-medical-700"
                >
                  {t.dashboard.bookFirst}
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              {t.dashboard.recentActivity}
            </h2>
            <ul className="mt-4 space-y-3">
              {activity.map((item) => (
                <li key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className="rounded-full bg-medical-50 px-3 py-1 text-sm font-semibold text-medical-700">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
            {activity.every((a) => a.value === 0) && (
              <p className="mt-4 text-sm text-slate-400">{t.dashboard.nothingYet}</p>
            )}
          </section>

          <Link
            to="/patient/emergency"
            className="flex items-center justify-between rounded-3xl bg-rose-600 p-5 text-white shadow-lg shadow-rose-500/25 transition-colors hover:bg-rose-700"
          >
            <div>
              <p className="text-lg font-bold">{t.dashboard.emergencyTitle}</p>
              <p className="text-sm text-rose-100">{t.dashboard.emergencyDesc}</p>
            </div>
            <Siren size={28} />
          </Link>
        </div>
      </div>
    </PatientShell>
  );
}
