import { createFileRoute } from "@tanstack/react-router";
import { body, fail } from "@/lib/server/api.server";
import { requireRole } from "@/lib/server/auth.server";
import { adminFlaggedReviews, adminModerate, getDirectoryDb } from "@/lib/server/directory.server";
import { guard, json } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";
import { ID_PATTERN } from "@/lib/server/store.server";

/**
 * Admin only moderation queue. The public sees the written reason for every decision.
 * GET → flagged reviews (no patient identity). PATCH { id, decision: "keep"|"remove", note }.
 */
export const Route = createFileRoute("/api/admin/reviews")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blocked = guard(request, { name: "admin-reviews", limit: 60 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["admin"]);
        if ("response" in auth) return auth.response;
        return json({ reviews: await adminFlaggedReviews(await getDirectoryDb()) });
      },
      PATCH: async ({ request }) => {
        const blocked = guard(request, { name: "admin-moderate", limit: 30 });
        if (blocked) return blocked;
        const auth = await requireRole(request, ["admin"]);
        if ("response" in auth) return auth.response;
        const parsed = await body(request, 1_500);
        if (!parsed.ok) return parsed.response;
        const id = str(parsed.b["id"], 64);
        const decision = parsed.b["decision"];
        if (!ID_PATTERN.test(id) || (decision !== "keep" && decision !== "remove"))
          return fail("invalid_request");
        const r = await adminModerate(
          await getDirectoryDb(),
          auth.session.sub,
          id,
          decision,
          str(parsed.b["note"], 400),
        );
        return r.ok ? json({ ok: true }) : fail(r.error, r.status ?? 400);
      },
    },
  },
});
