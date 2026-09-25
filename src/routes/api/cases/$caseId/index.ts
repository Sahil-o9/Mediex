import { createFileRoute } from "@tanstack/react-router";
import { requireDoctor } from "@/lib/server/auth.server";
import { guard, json, readJson } from "@/lib/server/guards.server";
import { str } from "@/lib/server/sanitize.server";
import { getStore, ID_PATTERN, StoreConfigError } from "@/lib/server/store.server";
import { CASE_REVIEW_STATUSES, type CaseReviewStatus } from "@/types/consult";

/** Doctor only. GET → full case. PATCH { status?, note? } → update status and/or append a clinical note. */
export const Route = createFileRoute("/api/cases/$caseId/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        if (!ID_PATTERN.test(params.caseId)) return json({ error: "not_found" }, 404);
        try {
          const store = getStore();
          const c = await store.get(params.caseId);
          return c ? json({ case: c, storage: store.mode }) : json({ error: "not_found" }, 404);
        } catch (e) {
          return json({ error: e instanceof StoreConfigError ? "store_not_configured" : "store_error" }, 503);
        }
      },

      PATCH: async ({ request, params }) => {
        const blocked = guard(request, { name: "case-update", limit: 60 });
        if (blocked) return blocked;
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        if (!ID_PATTERN.test(params.caseId)) return json({ error: "not_found" }, 404);

        const parsed = await readJson(request, 20_000);
        if (!parsed.ok) return parsed.response;
        const b = (parsed.data && typeof parsed.data === "object" ? parsed.data : {}) as Record<string, unknown>;
        const status = b["status"];
        const note = str(b["note"], 4000);
        if (status !== undefined && !CASE_REVIEW_STATUSES.includes(status as CaseReviewStatus)) {
          return json({ error: "invalid_status" }, 400);
        }
        if (status === undefined && !note) return json({ error: "invalid_request" }, 400);

        try {
          const store = getStore();
          let updated = null;
          if (status !== undefined) updated = await store.setStatus(params.caseId, status as CaseReviewStatus);
          if (note) {
            updated = await store.addNote(params.caseId, {
              id: crypto.randomUUID(),
              text: note,
              authorId: auth.session.sub,
              authorName: auth.session.name,
              createdAt: new Date().toISOString(),
            });
          }
          return updated ? json({ case: updated, storage: store.mode }) : json({ error: "not_found" }, 404);
        } catch (e) {
          return json({ error: e instanceof StoreConfigError ? "store_not_configured" : "store_error" }, 503);
        }
      },
    },
  },
});
