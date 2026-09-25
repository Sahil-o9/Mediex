import { createFileRoute } from "@tanstack/react-router";
import { asCaseState } from "@/lib/mediex/caseState";
import { MAX_FILES, MAX_FILE_BYTES } from "@/lib/mediex/documents";
import { requireDoctor } from "@/lib/server/auth.server";
import { MIME_FOR, sniffType } from "@/lib/server/documents.server";
import { guard, json } from "@/lib/server/guards.server";
import { asLang, sanitizeDetails, sanitizeIncludedDocuments, str } from "@/lib/server/sanitize.server";
import { getStore, StoreConfigError, type StoredFile } from "@/lib/server/store.server";
import type { StoredCase, StoredDocument } from "@/types/consult";

/**
 * GET  /api/cases  → doctor only: list of submitted cases.
 * POST /api/cases  → patient submits a finished consultation.
 *      multipart/form-data: `payload` (JSON) + optional `file:<documentId>` parts.
 *      Original files are stored ONLY for documents where the patient ticked
 *      "share the original with my doctor" and the file's real signature checks out.
 */

const MAX_MESSAGES = 200;

export const Route = createFileRoute("/api/cases/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireDoctor(request);
        if ("response" in auth) return auth.response;
        try {
          const store = getStore();
          return json({ cases: await store.list(), storage: store.mode });
        } catch (e) {
          return json({ error: e instanceof StoreConfigError ? "store_not_configured" : "store_error" }, 503);
        }
      },

      POST: async ({ request }) => {
        const blocked = guard(request, { name: "case-submit", limit: 6 });
        if (blocked) return blocked;
        if (Number(request.headers.get("content-length") ?? "0") > MAX_FILES * MAX_FILE_BYTES + 1_000_000) {
          return json({ error: "too_large" }, 413);
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ error: "invalid_request" }, 400);
        }
        const rawPayload = form.get("payload");
        if (typeof rawPayload !== "string" || rawPayload.length > 1_500_000) return json({ error: "invalid_request" }, 400);
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawPayload) as Record<string, unknown>;
        } catch {
          return json({ error: "invalid_request" }, 400);
        }

        const caseState = asCaseState(payload["caseState"]);
        const details = sanitizeDetails(payload["details"]);
        const docs = sanitizeIncludedDocuments(payload["documents"]);
        const messages = (Array.isArray(payload["messages"]) ? (payload["messages"] as unknown[]) : [])
          .filter((m): m is { role: "user" | "assistant"; text: string; createdAt?: string } => !!m && typeof m === "object" && ((m as { role: unknown }).role === "user" || (m as { role: unknown }).role === "assistant") && typeof (m as { text: unknown }).text === "string")
          .slice(0, MAX_MESSAGES)
          .map((m) => ({ role: m.role, text: m.text.slice(0, 4000), createdAt: str(m.createdAt, 40) || new Date().toISOString() }));

        if (!caseState.chiefComplaint && messages.filter((m) => m.role === "user").length === 0) {
          return json({ error: "empty_case" }, 400);
        }

        const summaryIn = (payload["aiSummary"] && typeof payload["aiSummary"] === "object" ? payload["aiSummary"] : {}) as Record<string, unknown>;
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        const files = new Map<string, StoredFile>();
        const storedDocs: StoredDocument[] = docs.map((d) => {
          let hasOriginal = false;
          const part = form.get(`file:${d.id}`);
          if (d.shareOriginal && part && typeof part !== "string" && part.size > 0 && part.size <= MAX_FILE_BYTES) {
            // Validated below once bytes are read (async), so mark tentatively.
            hasOriginal = true;
          }
          const { shareOriginal: _omit, ...rest } = d;
          return { ...rest, hasOriginal };
        });

        for (const d of storedDocs) {
          if (!d.hasOriginal) continue;
          const part = form.get(`file:${d.id}`);
          if (!part || typeof part === "string") {
            d.hasOriginal = false;
            continue;
          }
          const bytes = new Uint8Array(await part.arrayBuffer());
          const type = sniffType(bytes);
          if (!type) {
            d.hasOriginal = false;
            continue;
          }
          d.mime = MIME_FOR[type];
          d.size = bytes.length;
          files.set(d.id, { bytes, mime: MIME_FOR[type], name: d.fileName });
        }

        const stored: StoredCase = {
          id,
          createdAt: now,
          updatedAt: now,
          status: "new",
          urgent: caseState.redFlags.length > 0 || payload["emergency"] === true,
          language: asLang(payload["language"]),
          patient: details,
          caseState,
          messages,
          documents: storedDocs,
          aiSummary: { text: str(summaryIn["text"], 2500), generated: summaryIn["generated"] === true },
          notes: [],
        };

        try {
          await getStore().create(stored, files);
        } catch (e) {
          return json({ error: e instanceof StoreConfigError ? "store_not_configured" : "store_error" }, 503);
        }
        return json({ caseId: id, urgent: stored.urgent }, 201);
      },
    },
  },
});
