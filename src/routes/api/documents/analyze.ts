import { createFileRoute } from "@tanstack/react-router";
import { MAX_FILE_BYTES } from "@/lib/mediex/documents";
import { analyzeDocument, type AnalyzeErrorCode } from "@/lib/server/documents.server";
import { guard, json } from "@/lib/server/guards.server";
import { asLang } from "@/lib/server/sanitize.server";

/**
 * POST multipart/form-data { file, lang } → { analysis }
 *
 * The file is validated (size + real file signature), read in memory, and
 * discarded when the request ends. Nothing is written to disk or to any
 * database here — the patient reviews the result first, and only what they
 * choose to include is submitted with the case.
 */

const STATUS: Record<AnalyzeErrorCode, number> = {
  unsupported_type: 415,
  too_large: 413,
  empty_file: 400,
  unreadable_pdf: 422,
  unreadable_image: 422,
  pdf_parse_failed: 422,
  ai_not_configured: 503,
  rate_limit: 429,
  credits: 503,
  blocked: 503,
  ai_error: 502,
};

export const Route = createFileRoute("/api/documents/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guard(request, { name: "doc-analyze", limit: 10 });
        if (blocked) return blocked;

        if (Number(request.headers.get("content-length") ?? "0") > MAX_FILE_BYTES + 256 * 1024) {
          return json({ error: "too_large" }, 413);
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ error: "invalid_request" }, 400);
        }
        const file = form.get("file");
        if (!file || typeof file === "string") return json({ error: "invalid_request" }, 400);
        if (file.size > MAX_FILE_BYTES) return json({ error: "too_large" }, 413);

        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = await analyzeDocument({ bytes, lang: asLang(form.get("lang")) });
        if (!result.ok) return json({ error: result.error }, STATUS[result.error]);
        return json({ analysis: result.analysis });
      },
    },
  },
});
