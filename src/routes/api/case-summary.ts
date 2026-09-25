import { createFileRoute } from "@tanstack/react-router";
import { LANGUAGE_INSTRUCTION } from "@/lib/i18n/dictionary";
import { asCaseState } from "@/lib/mediex/caseState";
import { checkReplyLanguage } from "@/lib/mediex/language";
import { callModel, extractJson, getAiConfig, userText } from "@/lib/server/ai.server";
import { guard, json, readJson } from "@/lib/server/guards.server";
import { buildSummaryPrompt, docContextBlock, languageName } from "@/lib/server/prompts.server";
import { asLang, sanitizeDetails, sanitizeIncludedDocuments } from "@/lib/server/sanitize.server";

/**
 * POST { lang, caseState, documents, details } → { text, generated }
 * Writes the AI narrative for the case summary in the patient's selected
 * language. The structured sections of the summary are assembled from the
 * case data itself in the browser and do NOT depend on this call.
 */
export const Route = createFileRoute("/api/case-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guard(request, { name: "case-summary", limit: 10 });
        if (blocked) return blocked;
        const parsed = await readJson(request, 300_000);
        if (!parsed.ok) return parsed.response;
        const body = (parsed.data && typeof parsed.data === "object" ? parsed.data : {}) as Record<string, unknown>;

        const lang = asLang(body["lang"]);
        const caseState = asCaseState(body["caseState"]);
        const documents = sanitizeIncludedDocuments(body["documents"]);
        const details = sanitizeDetails(body["details"]);

        if (!getAiConfig()) return json({ error: "ai_not_configured" }, 503);

        const prompt = `Patient: age ${details.age ?? "not stated"}, sex ${details.sex || "not stated"}.\n\nPatient-reported case information (JSON):\n${JSON.stringify(caseState)}${docContextBlock(documents)}\n\nWrite the summary now as the JSON object.`;
        const attempt = async (extra?: string): Promise<string | null> => {
          const out = await callModel({ instructions: buildSummaryPrompt(lang), input: [userText(extra ? `${prompt}\n\n${extra}` : prompt)] });
          const o = extractJson(out) as { summary?: unknown } | null;
          const text = typeof o?.summary === "string" ? o.summary.trim().slice(0, 2500) : "";
          return text && checkReplyLanguage(text, lang).ok ? text : null;
        };

        try {
          const text =
            (await attempt()) ??
            (await attempt(`The previous summary was not in ${languageName(lang)}. ${LANGUAGE_INSTRUCTION[lang]} Return only the JSON object.`));
          if (!text) return json({ error: "language_mismatch" }, 502);
          return json({ text, generated: true });
        } catch {
          return json({ error: "ai_error" }, 502);
        }
      },
    },
  },
});
