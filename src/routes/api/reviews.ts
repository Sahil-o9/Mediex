import { createFileRoute } from "@tanstack/react-router";
import { body, fail } from "@/lib/server/api.server";
import { requireRole } from "@/lib/server/auth.server";
import {
  FLAG_REASONS,
  createReview,
  flagReview,
  getDirectoryDb,
  respondToReview,
  type FlagReason,
} from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";
import { ID_PATTERN } from "@/lib/server/store.server";

/**
 * POST  { appointmentId, rating, text }        — patient; needs a completed (verified) visit + verified phone.
 * PATCH { id, action: "flag", reason }         — doctor (dispute) or patient (appeal of a removal).
 * PATCH { id, action: "respond", text }        — doctor public reply.
 */
export const Route = createFileRoute("/api/reviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guard(request, { name: "review-create", limit: 6 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["patient"]);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("unauthorized", 401);
        const parsed = await body(request, 4_000);
        if (!parsed.ok) return parsed.response;
        const appointmentId = str(parsed.b["appointmentId"], 64);
        if (!ID_PATTERN.test(appointmentId)) return fail("no_verified_visit", 403);
        const db = await getDirectoryDb();
        const r = await createReview(db, auth.session.pid, {
          appointmentId,
          rating: typeof parsed.b["rating"] === "number" ? parsed.b["rating"] : 0,
          text: str(parsed.b["text"], 1100),
        });
        return r.ok ? json({ ok: true }, 201) : fail(r.error, r.status ?? 400);
      },

      PATCH: async ({ request }) => {
        const blocked = guard(request, { name: "review-update", limit: 20 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["patient", "doctor"]);
        if ("response" in auth) return auth.response;
        if (!auth.session.pid) return fail("unauthorized", 401);
        const parsed = await body(request, 2_000);
        if (!parsed.ok) return parsed.response;
        const id = str(parsed.b["id"], 64);
        if (!ID_PATTERN.test(id)) return fail("not_found", 404);
        const db = await getDirectoryDb();
        const role = auth.session.role as "patient" | "doctor";

        if (parsed.b["action"] === "flag") {
          const reason = str(parsed.b["reason"], 40) as FlagReason;
          if (!FLAG_REASONS.includes(reason)) return fail("invalid_reason");
          const r = await flagReview(db, { role, profileId: auth.session.pid }, id, reason);
          return r.ok ? json({ ok: true }) : fail(r.error, r.status ?? 400);
        }
        if (parsed.b["action"] === "respond") {
          if (role !== "doctor") return fail("forbidden", 403);
          const r = await respondToReview(db, auth.session.pid, id, str(parsed.b["text"], 700));
          return r.ok ? json({ ok: true }) : fail(r.error, r.status ?? 400);
        }
        return fail("invalid_request");
      },
    },
  },
});
