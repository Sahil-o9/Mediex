import { createFileRoute } from "@tanstack/react-router";
import { body, fail } from "@/lib/server/api.server";
import { requireRole } from "@/lib/server/auth.server";
import {
  bookAppointment,
  changeAppointmentStatus,
  getDirectoryDb,
  listDoctorAppointments,
  listPatientAppointments,
} from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";
import { ID_PATTERN } from "@/lib/server/store.server";
import type { AppointmentStatus } from "@/types/directory";

const STATUSES: AppointmentStatus[] = [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

/**
 * GET   → my appointments (patient: own; doctor: those booked with me).
 * POST  → patient books { doctorId, date, time, reason, shareSummary?: string }.
 * PATCH → { id, status } — doctor or patient, subject to allowed transitions.
 */
export const Route = createFileRoute("/api/appointments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "appt-list", limit: 90 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["patient", "doctor"]);
        if ("response" in auth) return auth.response;
        const db = await getDirectoryDb();
        if (!auth.session.pid) return json({ appointments: [] });
        return json({
          role: auth.session.role,
          appointments:
            auth.session.role === "patient"
              ? await listPatientAppointments(db, auth.session.pid)
              : await listDoctorAppointments(db, auth.session.pid),
        });
      },

      POST: async ({ request }) => {
        const blocked = guard(request, { name: "appt-book", limit: 12 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["patient"]);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("unauthorized", 401);
        const parsed = await body(request, 8_000);
        if (!parsed.ok) return parsed.response;
        const b = parsed.b;
        const doctorId = str(b["doctorId"], 64);
        if (!ID_PATTERN.test(doctorId)) return fail("doctor_unavailable", 404);
        const db = await getDirectoryDb();
        const r = await bookAppointment(db, auth.session.pid, {
          doctorId,
          date: str(b["date"], 10),
          time: str(b["time"], 5),
          reason: str(b["reason"], 300),
          // Only the text the patient explicitly approved; empty means nothing is shared.
          sharedSummary: b["shareSummary"] ? str(b["shareSummary"], 2000) : "",
        });
        if (!r.ok) return fail(r.error, r.status ?? 400);
        const appointment = { ...r.appointment };
        delete appointment.activeSlotKey;
        return json({ appointment }, 201);
      },

      PATCH: async ({ request }) => {
        const blocked = guard(request, { name: "appt-update", limit: 40 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["patient", "doctor"]);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("unauthorized", 401);
        const parsed = await body(request, 1_000);
        if (!parsed.ok) return parsed.response;
        const id = str(parsed.b["id"], 64);
        const status = str(parsed.b["status"], 20) as AppointmentStatus;
        if (!ID_PATTERN.test(id) || !STATUSES.includes(status)) return fail("invalid_request");
        const db = await getDirectoryDb();
        const r = await changeAppointmentStatus(
          db,
          { role: auth.session.role as "patient" | "doctor", profileId: auth.session.pid },
          id,
          status,
        );
        if (!r.ok) return fail(r.error, r.status ?? 400);
        const appointment = { ...r.appointment };
        delete appointment.activeSlotKey;
        return json({ appointment });
      },
    },
  },
});
