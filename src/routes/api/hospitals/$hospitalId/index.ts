import { createFileRoute } from "@tanstack/react-router";
import { fail } from "@/lib/server/api.server";
import { getDirectoryDb, searchHospitals } from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { ID_PATTERN } from "@/lib/server/store.server";

export const Route = createFileRoute("/api/hospitals/$hospitalId/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const blocked = guard(request, { name: "hospital-detail", limit: 60 });
        if (blocked) return blocked;
        if (!ID_PATTERN.test(params.hospitalId)) return fail("not_found", 404);
        const result = await searchHospitals(await getDirectoryDb(), {
          query: "",
          city: "",
          specialty: "",
          page: 1,
          pageSize: 1,
          hospitalId: params.hospitalId,
        });
        const hospital = result.hospitals[0];
        return hospital ? json({ hospital }) : fail("not_found", 404);
      },
    },
  },
});
