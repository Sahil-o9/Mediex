import { createFileRoute } from "@tanstack/react-router";
import { LANGUAGE_INSTRUCTION, type Lang } from "@/lib/i18n/dictionary";
import { EMPTY_CASE_STATE, type CaseState, type CaseStatus } from "@/types";

/**
 * Server-side GUIDED CASE-TAKING assistant endpoint.
 *
 * Unlike a generic Q&A chatbot, this endpoint drives an interview: on every
 * call it looks at the running case state + the patient's latest message
 * and decides (a) the single most relevant next question to ask, or
 * (b) that the case is complete, or (c) that the symptoms look urgent and
 * normal questioning should stop. The AI key never leaves the server.
 *
 * Safety is enforced in two layers:
 *  1. The system prompt forbids diagnosis, medicine names/doses, and
 *     invented facts, and requires escalation language for red flags.
 *  2. The exact completion / emergency sentences shown to the patient are
 *     NOT trusted to the model's wording — they are fixed, localized
 *     strings the server substitutes in whenever the model reports that
 *     status, so the required safety message always reaches the patient
 *     even if the model's own phrasing drifts.
 */

const CASE_FIELDS = `{
  "chiefComplaint": string,        // the main problem, in the patient's words
  "symptoms": string[],            // all symptoms mentioned so far
  "duration": string,              // how long it has been going on
  "severity": string,              // mild / moderate / severe, or patient's own words
  "location": string,              // body part / location, if relevant
  "associatedSymptoms": string[],  // other symptoms occurring alongside
  "history": string,               // relevant past medical history
  "medicines": string,             // medicines the patient is currently taking
  "allergies": string,             // known allergies
  "lifestyle": string,             // relevant diet/sleep/activity/habit notes
  "ayurvedic": string,             // relevant Ayurvedic case-taking notes (prakriti, agni, etc.) only if the patient volunteers or the clinic context calls for it — never invented
  "redFlags": string[]             // any potentially serious/emergency symptoms mentioned
}`;

function buildSystemPrompt(lang: Lang): string {
  return `You are the Mediex guided case-taking assistant inside a patient app in India. You are NOT a generic chatbot — you behave like an intelligent intake nurse conducting a structured but natural interview, one question at a time.

SAFETY RULES (never break these):
- You are NOT a doctor. Never diagnose, never name a condition as the patient's condition, never claim certainty.
- Never recommend, name, or dose any medicine, supplement or injection.
- Never invent test results, doctor names, hospital names, prices, statistics, or facts the patient did not state.
- If symptoms suggest a possible emergency (e.g. severe chest pain/pressure, breathing difficulty, signs of stroke, severe or uncontrolled bleeding, loss of consciousness, seizure, poisoning, severe allergic reaction, suicidal thoughts, severe injury/trauma), set "status" to "emergency" immediately and stop normal questioning — do not continue the interview.

HOW THE INTERVIEW WORKS:
- Read the running case information (JSON) and the latest patient message.
- Merge any new information from the latest message into the case information. Keep everything already known; only add or refine fields, never erase confirmed facts.
- Decide the SINGLE most clinically relevant next question given what is already known and the nature of the chief complaint. Do not use a fixed checklist or fixed order — tailor it. For example: headache → ask about location, duration, severity, triggers, associated symptoms (nausea, vision changes) in whatever order is most natural given what's already known; stomach pain → location, duration, relation to food, vomiting, bowel changes, fever; cough → duration, dry/wet, fever, breathlessness, chest pain. Ask about history, current medicines, allergies, and lifestyle only after the core symptom picture is reasonably clear, and only if not already known.
- Ask EXACTLY ONE short, clear, patient-friendly question at a time. Never ask multiple questions in one reply.
- When the patient mentions something new and relevant (e.g. vomiting, blood, fever), ask a natural, specific follow-up about that new detail before moving on.
- Only ask about fields that are actually relevant to this patient's complaint — skip irrelevant ones.
- Consider the case complete once you have a reasonably clear picture of: chief complaint, duration, severity, location (if applicable), the key associated symptoms, and at least a brief check of relevant history/medicines/allergies. This is usually after around 6-10 patient answers. When complete, set "status" to "complete" and stop asking further questions.
- Never fabricate an answer on the patient's behalf. If the patient's message is unclear, ask a short clarifying question instead of guessing.

LANGUAGE: ${LANGUAGE_INSTRUCTION[lang]} The patient may type in Hindi, Hinglish (Roman-script Hindi), or English regardless of the selected language — understand all three, but ALWAYS reply in the language instructed above. Keep replies short (roughly one sentence, well under 30 words), warm, and easy for a patient with no medical background to understand. Unavoidable medical/technical terms may stay in English.

OUTPUT FORMAT — CRITICAL:
Reply with ONLY a single valid JSON object, nothing else — no markdown, no code fences, no commentary before or after. Exactly this shape:
{
  "caseState": ${CASE_FIELDS},
  "status": "ongoing" | "emergency" | "complete",
  "reply": string   // your one next question (status "ongoing"), or a short one-line acknowledgement (status "emergency" or "complete" — the app will show its own required safety/completion message right after this, so keep it brief and do not repeat instructions to call emergency services or that the case is complete, the app handles that)
}`;
}

type Body = {
  message?: unknown;
  lang?: unknown;
  history?: unknown;
  caseState?: unknown;
};

type Turn = { role: "user" | "assistant"; text: string };

function asLang(value: unknown): Lang {
  return value === "hi" || value === "hinglish" ? value : "en";
}

function asCaseState(value: unknown): CaseState {
  if (!value || typeof value !== "object") return { ...EMPTY_CASE_STATE };
  const v = value as Partial<CaseState>;
  const str = (x: unknown) => (typeof x === "string" ? x : "");
  const arr = (x: unknown) =>
    Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : [];
  return {
    chiefComplaint: str(v.chiefComplaint),
    symptoms: arr(v.symptoms),
    duration: str(v.duration),
    severity: str(v.severity),
    location: str(v.location),
    associatedSymptoms: arr(v.associatedSymptoms),
    history: str(v.history),
    medicines: str(v.medicines),
    allergies: str(v.allergies),
    lifestyle: str(v.lifestyle),
    ayurvedic: str(v.ayurvedic),
    redFlags: arr(v.redFlags),
  };
}

const COMPLETE_MESSAGE: Record<Lang, string> = {
  en: "Your initial case information is complete. It can now be shared with the doctor.",
  hi: "आपकी प्रारंभिक केस जानकारी पूरी हो गई है। अब इसे डॉक्टर के साथ साझा किया जा सकता है।",
  hinglish:
    "Aapki prarambhik case jaankari poori ho gayi hai. Ab ise doctor ke saath share kiya ja sakta hai.",
};

const EMERGENCY_MESSAGE: Record<Lang, string> = {
  en: "The symptoms you have described may be serious. Please contact a doctor or the nearest hospital immediately.",
  hi: "आपके बताए लक्षण गंभीर हो सकते हैं। कृपया तुरंत डॉक्टर/नजदीकी अस्पताल से संपर्क करें।",
  hinglish:
    "Aapke bataye lakshan gambhir ho sakte hain. Kripya turant doctor/nazdeeki hospital se sampark karein.",
};

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(withoutFences);
  } catch {
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFences.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (!message) {
          return Response.json({ error: "invalid_request" }, { status: 400 });
        }
        const lang = asLang(body.lang);
        const caseState = asCaseState(body.caseState);
        const history: Turn[] = Array.isArray(body.history)
          ? (body.history as unknown[])
              .filter(
                (turn): turn is Turn =>
                  !!turn &&
                  typeof turn === "object" &&
                  typeof (turn as Turn).text === "string" &&
                  ((turn as Turn).role === "user" || (turn as Turn).role === "assistant"),
              )
              .slice(-10)
          : [];

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "ai_unavailable" }, { status: 503 });
        }

        const contextMessage = `Current known case information (JSON):\n${JSON.stringify(caseState)}\n\nLatest patient message: ${message}\n\nUpdate the case information and decide the next step. Reply with only the JSON object described in your instructions.`;

        const input = [
          ...history.map((turn) => ({
            role: turn.role,
            content: [
              {
                type: turn.role === "assistant" ? "output_text" : "input_text",
                text: turn.text,
              },
            ],
          })),
          {
            role: "user" as const,
            content: [{ type: "input_text", text: contextMessage }],
          },
        ];

        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              instructions: buildSystemPrompt(lang),
              input,
              stream: true,
              reasoning: { effort: "low", summary: "auto" },
            }),
          });

          if (!upstream.ok || !upstream.body) {
            const status = upstream.status;
            const reason =
              status === 429
                ? "rate_limit"
                : status === 402
                  ? "credits"
                  : status === 403
                    ? "blocked"
                    : "ai_error";
            return Response.json({ error: reason }, { status: 502 });
          }

          // Consume the SSE stream server-side and return the final JSON text.
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let raw = "";

          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const event = JSON.parse(payload) as {
                  type?: string;
                  delta?: string;
                  response?: { output_text?: string | string[] };
                };
                if (event.type === "response.output_text.delta" && event.delta) {
                  raw += event.delta;
                } else if (event.type === "response.completed" && !raw) {
                  const out = event.response?.output_text;
                  if (typeof out === "string") raw = out;
                  else if (Array.isArray(out)) raw = out.join("");
                }
              } catch {
                /* ignore keep-alive / partial frames */
              }
            }
          }

          const parsed = extractJson(raw) as {
            caseState?: unknown;
            status?: unknown;
            reply?: unknown;
          } | null;

          if (!parsed) return Response.json({ error: "empty" }, { status: 502 });

          const nextCaseState = asCaseState(parsed.caseState ?? caseState);
          const status: CaseStatus =
            parsed.status === "emergency" || parsed.status === "complete"
              ? parsed.status
              : "ongoing";

          let reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
          if (status === "emergency") {
            if (nextCaseState.redFlags.length === 0) nextCaseState.redFlags.push(message);
            reply = EMERGENCY_MESSAGE[lang];
          } else if (status === "complete") {
            reply = COMPLETE_MESSAGE[lang];
          } else if (!reply) {
            return Response.json({ error: "empty" }, { status: 502 });
          }

          return Response.json({ reply, status, caseState: nextCaseState });
        } catch {
          return Response.json({ error: "ai_error" }, { status: 502 });
        }
      },
    },
  },
});
