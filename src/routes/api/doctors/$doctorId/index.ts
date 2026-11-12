import { createFileRoute } from "@tanstack/react-router";
import { fail } from "@/lib/server/api.server";
import {
  getDirectoryDb,
  listPublicReviews,
  loadProfile,
  ratingsMap,
  slotsFor,
} from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { ID_PATTERN } from "@/lib/server/store.server";
import { isValidDate } from "@/lib/mediex/scheduling";

/** GET /api/doctors/:id[?date=YYYY-MM-DD] → public profile, reviews, and (with date) bookable slots. */
export const Route = createFileRoute("/api/doctors/$doctorId/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const blocked = guard(request, { name: "doctor-detail", limit: 90 });
        if (blocked) return blocked;
        if (!ID_PATTERN.test(params.doctorId)) return fail("not_found", 404);
        const db = await getDirectoryDb();
        const profile = await loadProfile(db, params.doctorId);
        if (!profile) return fail("not_found", 404);
        const date = new URL(request.url).searchParams.get("date");
        let slots: string[] | null | undefined;
        if (date) {
          if (!isValidDate(date)) return fail("invalid_date");
          slots = await slotsFor(db, params.doctorId, date);
        }
        const reviews = await listPublicReviews(db, params.doctorId);
        const rating = (await ratingsMap(db)).get(params.doctorId) ?? { average: null, count: 0 };
        return json({
          doctor: profile,
          reviews,
          rating,
          ...(date ? { date, slots: slots ?? [] } : {}),
        });
      },
    },
  },
});
