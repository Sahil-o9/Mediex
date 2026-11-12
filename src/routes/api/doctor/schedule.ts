import { createFileRoute } from "@tanstack/react-router";
import { body, fail } from "@/lib/server/api.server";
import { requireDoctor } from "@/lib/server/auth.server";
import {
  addLeave,
  getDirectoryDb,
  removeLeave,
  setAvailability,
} from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";
import { ID_PATTERN } from "@/lib/server/store.server";

/**
 * PUT    { availability: [{weekday,startTime,endTime}] } — replaces the weekly timetable.
 * POST   { startDate, endDate, reason }                   — adds a holiday/leave.
 * DELETE { id }                                           — removes a leave.
 */
export const Route = createFileRoute("/api/doctor/schedule")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        const blocked = guard(request, { name: "doctor-schedule", limit: 30 });
        if (blocked) return blocked;
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("no_profile", 404);
        const parsed = await body(request, 10_000);
        if (!parsed.ok) return parsed.response;
        const list = Array.isArray(parsed.b["availability"]) ? parsed.b["availability"] : null;
        if (!list || list.length > 21) return fail("invalid_request");
        const windows = list.map((w) => {
          const o = (w && typeof w === "object" ? w : {}) as Record<string, unknown>;
          return {
            weekday: typeof o["weekday"] === "number" ? o["weekday"] : -1,
            startTime: str(o["startTime"], 5),
            endTime: str(o["endTime"], 5),
          };
        });
        const db = await getDirectoryDb();
        const r = await setAvailability(db, auth.session.pid, windows);
        return r.ok ? json({ availability: r.availability }) : fail(r.error, r.status ?? 400);
      },

      POST: async ({ request }) => {
        const blocked = guard(request, { name: "doctor-leave", limit: 30 });
        if (blocked) return blocked;
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("no_profile", 404);
        const parsed = await body(request, 2_000);
        if (!parsed.ok) return parsed.response;
        const db = await getDirectoryDb();
        const r = await addLeave(db, auth.session.pid, {
          startDate: str(parsed.b["startDate"], 10),
          endDate: str(parsed.b["endDate"], 10),
          reason: str(parsed.b["reason"], 120),
        });
        return r.ok
          ? json({ leave: r.leave, affectedAppointments: r.affectedAppointments }, 201)
          : fail(r.error, r.status ?? 400);
      },

      DELETE: async ({ request }) => {
        const blocked = guard(request, { name: "doctor-leave-del", limit: 30 });
        if (blocked) return blocked;
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("no_profile", 404);
        const parsed = await body(request, 500);
        if (!parsed.ok) return parsed.response;
        const id = str(parsed.b["id"], 64);
        if (!ID_PATTERN.test(id)) return fail("not_found", 404);
        const db = await getDirectoryDb();
        return (await removeLeave(db, auth.session.pid, id))
          ? json({ ok: true })
          : fail("not_found", 404);
      },
    },
  },
});
