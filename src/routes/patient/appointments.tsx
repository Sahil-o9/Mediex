import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  CalendarClock,
  Clock,
  Hospital as HospitalIcon,
  Stethoscope,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { hospitals } from "@/lib/mediex/data";
import { getAppointments, saveAppointment, cancelAppointment, newId } from "@/lib/mediex/storage";
import type { Appointment, Patient } from "@/types";

export const Route = createFileRoute("/patient/appointments")({
  validateSearch: (search: Record<string, unknown>) => ({
    hospital: typeof search["hospital"] === "string" ? search["hospital"] : undefined,
    doctor: typeof search["doctor"] === "string" ? search["doctor"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Book & Manage Appointments | Mediex" },
      {
        name: "description",
        content:
          "Book a consultation with a doctor at a nearby hospital, pick a time slot, and review or cancel your upcoming Mediex appointments.",
      },
      { property: "og:title", content: "Book & Manage Appointments | Mediex" },
      {
        property: "og:description",
        content: "Pick a hospital, doctor and time slot, then manage your bookings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequirePatient>{(patient) => <Appointments patient={patient} />}</RequirePatient>
  ),
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Appointments({ patient }: { patient: Patient }) {
  const search = useSearch({ from: "/patient/appointments" });
  const [hospitalId, setHospitalId] = useState(search["hospital"] ?? hospitals[0]!.id);
  const [doctorId, setDoctorId] = useState(search["doctor"] ?? hospitals[0]!.doctors[0]!.id);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [list, setList] = useState<Appointment[]>([]);

  useEffect(() => {
    setList(getAppointments(patient.patientId));
  }, [patient.patientId]);

  const hospital = useMemo(
    () => hospitals.find((h) => h.id === hospitalId) ?? hospitals[0]!,
    [hospitalId],
  );
  const doctor = useMemo(
    () => hospital.doctors.find((d) => d.id === doctorId) ?? hospital.doctors[0]!,
    [hospital, doctorId],
  );

  useEffect(() => {
    if (!hospital.doctors.some((d) => d.id === doctorId)) {
      setDoctorId(hospital.doctors[0]!.id);
    }
    setTime("");
  }, [hospital, doctorId]);

  const handleBook = () => {
    setError("");
    if (!date) return setError("Please choose a date for your visit.");
    if (date < today()) return setError("Please choose today or a future date.");
    if (!time) return setError("Please select an available time slot.");

    const appointment: Appointment = {
      id: newId("APT"),
      patientId: patient.patientId,
      patientName: patient.fullName,
      contact: patient.mobileNumber,
      hospitalName: hospital.name,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      date,
      time,
      reason: reason.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    saveAppointment(appointment);
    setList(getAppointments(patient.patientId));
    setConfirmed(appointment);
    setReason("");
    setTime("");
  };

  const handleCancel = (id: string) => {
    cancelAppointment(id);
    setList(getAppointments(patient.patientId));
    if (confirmed?.id === id) setConfirmed(null);
  };

  return (
    <PatientShell title="Appointments" subtitle="Book a consultation and keep track of your visits">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <CalendarCheck size={18} className="text-medical-600" />
            Book a new appointment
          </h2>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Hospital
              </span>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-medical-400 focus:bg-white"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.city}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Doctor
              </span>
              <select
                value={doctor.id}
                onChange={(e) => setDoctorId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-medical-400 focus:bg-white"
              >
                {hospital.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </span>
              <input
                type="date"
                value={date}
                min={today()}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-medical-400 focus:bg-white"
              />
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Available slots
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {doctor.slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTime(s)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                      time === s
                        ? "bg-medical-600 text-white shadow-sm shadow-medical-500/30"
                        : "bg-slate-100 text-slate-600 hover:bg-medical-50 hover:text-medical-700"
                    }`}
                  >
                    <Clock size={14} />
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reason for visit (optional)
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Briefly describe your symptoms or the purpose of the visit"
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-medical-400 focus:bg-white"
              />
            </label>

            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                {error}
              </p>
            )}

            <button
              onClick={handleBook}
              className="w-full rounded-xl bg-medical-600 py-3 text-sm font-semibold text-white shadow-sm shadow-medical-500/30 transition hover:bg-medical-700"
            >
              Confirm appointment
            </button>
          </div>
        </section>

        <div className="space-y-5">
          {confirmed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100"
            >
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 size={18} />
                Appointment confirmed
              </p>
              <p className="mt-2 text-sm text-emerald-900">
                {confirmed.doctorName} · {confirmed.specialty}
              </p>
              <p className="text-xs text-emerald-800">
                {confirmed.hospitalName} · {confirmed.date} at {confirmed.time}
              </p>
              <p className="mt-2 text-[11px] font-medium text-emerald-700">
                Booking reference {confirmed.id}
              </p>
            </motion.div>
          )}

          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <CalendarClock size={18} className="text-medical-600" />
              Your appointments
            </h2>

            {list.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                No appointments yet. Book one using the form to see it here.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {list.map((a) => (
                  <li key={a.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <Stethoscope size={14} className="text-medical-600" />
                          {a.doctorName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <HospitalIcon size={13} className="text-medical-500" />
                          {a.hospitalName}
                        </p>
                        <p className="mt-1 text-xs font-medium text-medical-700">
                          {a.date} at {a.time} · {a.specialty}
                        </p>
                        {a.reason && (
                          <p className="mt-1 text-xs text-slate-500">Reason: {a.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCancel(a.id)}
                        aria-label={`Cancel appointment with ${a.doctorName}`}
                        className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PatientShell>
  );
}
