import { createFileRoute } from "@tanstack/react-router";
import { isValidLatLng } from "@/lib/mediex/geo";
import { getDirectoryDb, searchDoctors } from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { fail } from "@/lib/server/api.server";
import type { SpecialtyTarget } from "@/lib/mediex/ranking";
import { isSpecialtyId, SPECIALTIES, type SpecialtyId } from "@/types/directory";

/** GET /api/doctors?specialty=cardiology&lat=..&lng=.. — manual browse (no chat). Omit specialty for everyone. */
export const Route = createFileRoute("/api/doctors/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "doctors", limit: 60 });
        if (blocked) return blocked;
        const u = new URL(request.url);
        const sp = u.searchParams.get("specialty");
        if (sp && !isSpecialtyId(sp)) return fail("invalid_specialty");
        const lat = Number(u.searchParams.get("lat"));
        const lng = Number(u.searchParams.get("lng"));
        const patient =
          u.searchParams.has("lat") && isValidLatLng({ lat, lng }) ? { lat, lng } : null;
        const targets = sp
          ? [{ id: sp as SpecialtyId, weight: 1 }]
          : SPECIALTIES.map((s) => ({ id: s.id, weight: 1 }));
        const db = await getDirectoryDb();
        return json({
          ...(await searchDoctors(db, { targets, patient, limit: 30 })),
          locationUsed: patient !== null,
        });
      },
    },
  },
});
