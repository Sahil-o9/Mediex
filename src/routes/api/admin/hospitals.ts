import { createFileRoute } from "@tanstack/react-router";
import { body, fail } from "@/lib/server/api.server";
import { requireRole } from "@/lib/server/auth.server";
import {
  adminListHospitals,
  adminSetHospitalVerification,
  getDirectoryDb,
} from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";
import { ID_PATTERN } from "@/lib/server/store.server";

export const Route = createFileRoute("/api/admin/hospitals")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "admin-hospitals", limit: 60 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["admin"]);
        if ("response" in auth) return auth.response;
        return json({ hospitals: await adminListHospitals(await getDirectoryDb()) });
      },
      PATCH: async ({ request }) => {
        const blocked = guard(request, { name: "admin-hospital-verify", limit: 30 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["admin"]);
        if ("response" in auth) return auth.response;
        const parsed = await body(request, 500);
        if (!parsed.ok) return parsed.response;
        const id = str(parsed.b["id"], 64);
        const decision = parsed.b["decision"];
        if (
          !ID_PATTERN.test(id) ||
          (decision !== "verify" && decision !== "reject" && decision !== "reset")
        ) {
          return fail("invalid_request");
        }
        const result = await adminSetHospitalVerification(await getDirectoryDb(), id, decision);
        return result.ok ? json({ ok: true }) : fail(result.error, result.status ?? 400);
      },
    },
  },
});
