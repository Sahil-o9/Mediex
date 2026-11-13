import { createFileRoute } from "@tanstack/react-router";
import { fail } from "@/lib/server/api.server";
import { getDirectoryDb, searchHospitals } from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";
import { isSpecialtyId } from "@/types/directory";

export const Route = createFileRoute("/api/hospitals/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "hospitals", limit: 60 });
        if (blocked) return blocked;
        const search = new URL(request.url).searchParams;
        const page = Number(search.get("page") ?? "1");
        const pageSize = Number(search.get("pageSize") ?? "20");
        const specialty = search.get("specialty") ?? "";
        if (
          !Number.isInteger(page) ||
          page < 1 ||
          !Number.isInteger(pageSize) ||
          pageSize < 1 ||
          pageSize > 50 ||
          (specialty && !isSpecialtyId(specialty))
        ) {
          return fail("invalid_request");
        }
        const result = await searchHospitals(await getDirectoryDb(), {
          query: str(search.get("q"), 120),
          city: str(search.get("city"), 60),
          specialty,
          page,
          pageSize,
        });
        return json(result);
      },
    },
  },
});
