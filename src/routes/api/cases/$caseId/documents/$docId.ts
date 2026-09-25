import { createFileRoute } from "@tanstack/react-router";
import { requireDoctor } from "@/lib/server/auth.server";
import { json } from "@/lib/server/guards.server";
import { getStore, ID_PATTERN, StoreConfigError } from "@/lib/server/store.server";

/**
 * Doctor only. Streams an original file the patient consented to share.
 * Served with headers that stop the browser from sniffing or running it as a page.
 */
export const Route = createFileRoute("/api/cases/$caseId/documents/$docId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        if (!ID_PATTERN.test(params.caseId) || !ID_PATTERN.test(params.docId)) return json({ error: "not_found" }, 404);
        try {
          const file = await getStore().getFile(params.caseId, params.docId);
          if (!file) return json({ error: "not_found" }, 404);
          const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "document";
          return new Response(file.bytes as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": file.mime,
              "Content-Disposition": `inline; filename="${safeName}"`,
              "X-Content-Type-Options": "nosniff",
              "Cache-Control": "private, no-store",
              "Content-Security-Policy": "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'",
            },
          });
        } catch (e) {
          return json({ error: e instanceof StoreConfigError ? "store_not_configured" : "store_error" }, 503);
        }
      },
    },
  },
});
