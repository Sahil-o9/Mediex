import { createFileRoute } from "@tanstack/react-router";
import { body, fail } from "@/lib/server/api.server";
import { requireRole } from "@/lib/server/auth.server";
import {
  adminListDoctors,
  adminSetVerification,
  getDirectoryDb,
} from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";
import { ID_PATTERN } from "@/lib/server/store.server";

/**
 * Admin only. GET → registered (non-demo) doctors with registration details.
 * PATCH { id, decision: "verify" | "reject" | "reset" } — the admin must have checked the number against the official register.
 */
export const Route = createFileRoute("/api/admin/doctors")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "admin-doctors", limit: 60 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["admin"]);
        if ("response" in auth) return auth.response;
        return json({ doctors: await adminListDoctors(await getDirectoryDb()) });
      },
      PATCH: async ({ request }) => {
        const blocked = guard(request, { name: "admin-verify", limit: 30 });
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
        )
          return fail("invalid_request");
        const r = await adminSetVerification(await getDirectoryDb(), id, decision);
        return r.ok ? json({ ok: true }) : fail(r.error, r.status ?? 400);
      },
    },
  },
});
