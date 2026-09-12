import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Siren, Phone, MapPin, HeartPulse, ShieldAlert, UserRound } from "lucide-react";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { emergencyContacts, hospitals } from "@/lib/mediex/data";
import type { Patient } from "@/types";

export const Route = createFileRoute("/patient/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Help & Helplines | Mediex" },
      {
        name: "description",
        content:
          "One-tap emergency helplines, your emergency contact, nearest 24x7 hospitals and simple first-response steps while help arrives.",
      },
      { property: "og:title", content: "Emergency Help & Helplines | Mediex" },
      {
        property: "og:description",
        content: "Helplines, emergency contact and nearest 24x7 hospitals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <RequirePatient>{(patient) => <Emergency patient={patient} />}</RequirePatient>,
});

const firstSteps = [
  "Stay with the person and keep them calm and still.",
  "Call the emergency number and clearly state the location.",
  "Do not offer food, water or medicines unless a professional advises it.",
  "Keep any medical reports, prescriptions and allergy details ready to hand over.",
];

function Emergency({ patient }: { patient: Patient }) {
  const nearest24x7 = hospitals
    .filter((h) => h.status === "Open 24x7")
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <PatientShell
      title="Emergency Assistance"
      subtitle="Fast access to helplines, your contact person and 24x7 hospitals"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 to-rose-500 p-6 text-white shadow-lg shadow-rose-500/25 md:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-100">
              <Siren size={18} />
              In an emergency
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">Call 112 immediately</h2>
            <p className="mt-1 max-w-md text-sm text-rose-100">
              112 is the single national emergency number for police, fire and ambulance services in
              India.
            </p>
          </div>
          <a
            href="tel:112"
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-50"
          >
            <Phone size={18} />
            Call 112 now
          </a>
        </div>
      </motion.div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {emergencyContacts.map((c, i) => (
          <motion.a
            key={c.value}
            href={`tel:${c.value}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:ring-medical-200"
          >
            <div>
              <p className="text-sm font-semibold text-slate-700">{c.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">Tap to dial</p>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-medical-50 px-3.5 py-2 text-sm font-bold text-medical-700">
              <Phone size={15} />
              {c.value}
            </span>
          </motion.a>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:p-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <UserRound size={18} className="text-medical-600" />
            Your emergency details
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">Patient</dt>
              <dd className="font-semibold text-slate-700">{patient.fullName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">Mediex ID</dt>
              <dd className="font-semibold text-slate-700">{patient.patientId}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">Blood group</dt>
              <dd className="font-semibold text-slate-700">{patient.bloodGroup || "Not added"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-500">Emergency contact</dt>
              <dd className="font-semibold text-slate-700">
                {patient.emergencyContact ? (
                  <a
                    href={`tel:${patient.emergencyContact}`}
                    className="text-medical-700 hover:underline"
                  >
                    {patient.emergencyContact}
                  </a>
                ) : (
                  "Not added"
                )}
              </dd>
            </div>
          </dl>
          {!patient.emergencyContact && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-100">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              Add an emergency contact and blood group on your Profile page so they appear here.
            </p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:p-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <MapPin size={18} className="text-medical-600" />
            Nearest 24x7 hospitals
          </h3>
          <ul className="mt-4 space-y-3">
            {nearest24x7.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{h.name}</p>
                  <p className="text-xs text-slate-500">
                    {h.address}, {h.city} · {h.distanceKm} km
                  </p>
                </div>
                <a
                  href={`tel:${h.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                >
                  <Phone size={13} />
                  Call
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <HeartPulse size={18} className="text-rose-500" />
          While help is on the way
        </h3>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {firstSteps.map((s, i) => (
            <li key={s} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-medical-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="text-sm text-slate-600">{s}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          These are general steps only and do not replace instructions from trained medical
          professionals.
        </p>
      </section>
    </PatientShell>
  );
}
