import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  Clock,
  Hospital,
  Loader2,
  MapPin,
  Stethoscope,
  Trash2,
} from "lucide-react";
import PatientShell from "@/components/PatientShell";
import { RequirePatient } from "@/components/RequirePatient";
import { apiFetch, errorText } from "@/lib/mediex/http";
import type { PatientAppointmentView } from "@/types/directory";

export const Route = createFileRoute("/patient/appointments")({
  head: () => ({
    meta: [
      { title: "My Appointments | Mediex" },
      {
        name: "description",
        content: "Review and manage appointments booked with Mediex doctors.",
      },
    ],
  }),
  component: () => <RequirePatient>{() => <Appointments />}</RequirePatient>,
});

function statusLabel(status: PatientAppointmentView["status"]): string {
  return status.replace("_", " ");
}

function Appointments() {
  const [appointments, setAppointments] = useState<PatientAppointmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void apiFetch<{ appointments: PatientAppointmentView[] }>("/api/appointments").then(
      (result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(errorText(result.error));
          setAppointments([]);
        } else {
          setAppointments(result.data.appointments);
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [reload]);

  async function cancel(id: string) {
    setBusyId(id);
    setError("");
    const result = await apiFetch("/api/appointments", {
      method: "PATCH",
      body: { id, status: "cancelled" },
    });
    setBusyId(null);
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    setReload((value) => value + 1);
  }

  return (
    <PatientShell title="Appointments" subtitle="Review and manage your booked consultations">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <CalendarCheck size={18} className="text-medical-600" />
            Your appointments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Appointment status and booking details are loaded from your account.
          </p>
        </div>
        <Link
          to="/patient/find-doctor"
          className="rounded-xl bg-medical-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-medical-700"
        >
          Find a doctor
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl bg-white p-10 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/70">
          <Loader2 size={18} className="animate-spin" />
          Loading your appointments…
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
          <CalendarClock size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">No appointments yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Book a consultation with a doctor to see it here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {appointments.map((appointment) => {
            const canCancel =
              appointment.status === "requested" || appointment.status === "confirmed";
            const mapsUrl = appointment.clinicAddress
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.clinicAddress)}`
              : null;
            return (
              <li
                key={appointment.id}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Stethoscope size={16} className="text-medical-600" />
                      {appointment.doctorName}
                      {appointment.specialty && (
                        <span className="font-normal text-slate-500">
                          · {appointment.specialty}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <Hospital size={15} className="text-medical-500" />
                      {appointment.clinicName || "Clinic details unavailable"}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={15} className="text-medical-500" />
                      {appointment.date} at {appointment.time}
                    </p>
                    {appointment.reason && (
                      <p className="mt-2 text-xs text-slate-500">Reason: {appointment.reason}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-medical-50 px-3 py-1 text-xs font-semibold capitalize text-medical-700">
                    {statusLabel(appointment.status)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <MapPin size={14} />
                      Directions
                    </a>
                  )}
                  {canCancel && (
                    <button
                      type="button"
                      disabled={busyId === appointment.id}
                      onClick={() => void cancel(appointment.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {busyId === appointment.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Cancel appointment
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PatientShell>
  );
}
