import { createFileRoute } from "@tanstack/react-router";
import { LANGUAGE_INSTRUCTION } from "@/lib/i18n/dictionary";
import { asCaseState, mergeCaseState } from "@/lib/mediex/caseState";
import { checkReplyLanguage } from "@/lib/mediex/language";
import { detectEmergency } from "@/lib/mediex/safety";
import { EMPTY_CASE_STATE, type CaseState, type CaseStatus } from "@/types";
import { AiError, callModel, extractJson, getAiConfig, turnFrom, userText, type AiTurn } from "@/lib/server/ai.server";
import { guard, json, readJson } from "@/lib/server/guards.server";
import { buildInterviewPrompt, buildStartInstruction, docContextBlock, languageName } from "@/lib/server/prompts.server";
import { asLang, sanitizeIncludedDocuments, str } from "@/lib/server/sanitize.server";

/**
 * AI-led case-taking endpoint.
 *
 * Every call: (1) deterministic multilingual emergency pre-screen — no model
 * call, immediate escalation; (2) the model picks the ONE next question from
 * the running case state + conversation + patient-approved document data;
 * (3) the reply is checked to be in the SELECTED language and retried once
 * if it is not; (4) the model's case-state is merged so it can never erase a
 * known fact. The AI key never leaves the server.
 */

type Turn = { role: "user" | "assistant"; text: string };

const COMPLETE_MESSAGE: Record<"en" | "hi" | "hinglish", string> = {
  en: "Your initial case information is complete. It can now be shared with the doctor.",
  hi: "आपकी प्रारंभिक केस जानकारी पूरी हो गई है। अब इसे डॉक्टर के साथ साझा किया जा सकता है।",
  hinglish: "Aapki prarambhik case jaankari poori ho gayi hai. Ab ise doctor ke saath share kiya ja sakta hai.",
};

const EMERGENCY_MESSAGE: Record<"en" | "hi" | "hinglish", string> = {
  en: "The symptoms you have described may be serious. Please contact a doctor or the nearest hospital immediately.",
  hi: "आपके बताए लक्षण गंभीर हो सकते हैं। कृपया तुरंत डॉक्टर/नजदीकी अस्पताल से संपर्क करें।",
  hinglish: "Aapke bataye lakshan gambhir ho sakte hain. Kripya turant doctor/nazdeeki hospital se sampark karein.",
};

const MAX_USER_TURNS = 20;

interface ModelOutput {
  caseState?: unknown;
  status?: unknown;
  reply?: unknown;
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guard(request, { name: "assistant", limit: 40 });
        if (blocked) return blocked;

        const parsedBody = await readJson(request, 300_000);
        if (!parsedBody.ok) return parsedBody.response;
        const body = (parsedBody.data && typeof parsedBody.data === "object" ? parsedBody.data : {}) as Record<string, unknown>;

        const lang = asLang(body["lang"]);
        const mode = body["mode"] === "start" ? "start" : "answer";
        const message = str(body["message"], 2000);
        if (mode === "answer" && !message) return json({ error: "invalid_request" }, 400);

        const previous: CaseState = mode === "start" ? { ...EMPTY_CASE_STATE } : asCaseState(body["caseState"]);
        const documents = sanitizeIncludedDocuments(body["documents"]);
        const history: Turn[] = (Array.isArray(body["history"]) ? (body["history"] as unknown[]) : [])
          .filter((t): t is Turn => !!t && typeof t === "object" && typeof (t as Turn).text === "string" && ((t as Turn).role === "user" || (t as Turn).role === "assistant"))
          .slice(-16)
          .map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }));
        const turnCount = Math.max(0, Math.min(1000, Math.floor(Number(body["turnCount"]) || history.filter((t) => t.role === "user").length)));
        const skipped = body["skipped"] === true;

        /* ---- 1. Deterministic emergency pre-screen (before any model call) ---- */
        if (mode === "answer") {
          const em = detectEmergency(message);
          if (em.emergency) {
            const cs = { ...previous, redFlags: [...previous.redFlags, message.slice(0, 200)] };
            return json({ reply: EMERGENCY_MESSAGE[lang], status: "emergency" satisfies CaseStatus, caseState: asCaseState(cs), source: "safety_screen" });
          }
        }

        /* ---- 2. AI ---- */
        if (!getAiConfig()) return json({ error: "ai_not_configured" }, 503);

        const docBlock = docContextBlock(documents);
        const finalTurn =
          mode === "start"
            ? `${buildStartInstruction(lang)}${docBlock}`
            : `Current known case information (JSON):\n${JSON.stringify(previous)}\n\n<patient_message>\n${message}\n</patient_message>${
                skipped ? "\n\nThe patient chose to SKIP / does not know the answer to your last question. Record the topic in \"unanswered\" and move on; do not ask about it again." : ""
              }${docBlock}\n\nUpdate the case information and decide the next step. Reply with only the JSON object described in your instructions.`;

        const input: AiTurn[] = [...history.map((t) => turnFrom(t.role, t.text)), userText(finalTurn)];
        const instructions = buildInterviewPrompt(lang);

        const attempt = async (reminder?: string): Promise<{ out: ModelOutput | null; languageOk: boolean }> => {
          const text = await callModel({ instructions, input: reminder ? [...input, userText(reminder)] : input });
          const out = extractJson(text) as ModelOutput | null;
          if (!out || typeof out.reply !== "string" || !out.reply.trim()) return { out: null, languageOk: false };
          const status = out.status === "emergency" || out.status === "complete" ? out.status : "ongoing";
          // Emergency / complete replies are replaced by fixed localized text, so only check questions.
          const languageOk = status !== "ongoing" || checkReplyLanguage(out.reply, lang).ok;
          return { out, languageOk };
        };

        try {
          let result = await attempt();
          if (!result.out || !result.languageOk) {
            result = await attempt(
              `Your previous reply was rejected: it was not valid JSON or the "reply" was not written in ${languageName(lang)}. ${LANGUAGE_INSTRUCTION[lang]} Reply again with ONLY the JSON object, with "reply" strictly in ${languageName(lang)}.`,
            );
          }
          if (!result.out) return json({ error: "empty" }, 502);
          if (!result.languageOk) return json({ error: "language_mismatch" }, 502);

          const out = result.out;
          const modelState = asCaseState(out.caseState);
          let status: CaseStatus = out.status === "emergency" || out.status === "complete" ? out.status : "ongoing";
          let reply = String(out.reply).trim().slice(0, 600);

          if (mode === "start") {
            status = "ongoing";
            return json({ reply, status, caseState: previous, source: "ai" });
          }

          const caseState = mergeCaseState(previous, modelState);
          if (status === "ongoing" && turnCount + 1 >= MAX_USER_TURNS) status = "complete";
          if (status === "emergency") {
            if (caseState.redFlags.length === 0) caseState.redFlags.push(message.slice(0, 200));
            reply = EMERGENCY_MESSAGE[lang];
          } else if (status === "complete") {
            reply = COMPLETE_MESSAGE[lang];
          }
          return json({ reply, status, caseState, source: "ai" });
        } catch (err) {
          const code = err instanceof AiError && (err.code === "rate_limit" || err.code === "credits" || err.code === "blocked") ? err.code : "ai_error";
          return json({ error: code }, 502);
        }
      },
    },
  },
});
