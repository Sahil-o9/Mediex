// TEST HARNESS ONLY — a stand-in for the AI gateway so the backend can be exercised without a real key.
// It is never used by the app unless AI_GATEWAY_URL points at it. Magic words in the patient's message
// trigger failure modes so the server-side guards can be verified.
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 9911);
export const calls = [];

const Q = {
  hi: ["आपको यह परेशानी कब से हो रही है?", "दर्द कितना तेज़ है — हल्का, मध्यम या ज़्यादा?", "क्या आपको कोई और परेशानी भी है, जैसे उल्टी या बुखार?", "क्या आप कोई दवा ले रहे हैं?"],
  hinglish: ["Aapko yeh pareshani kab se ho rahi hai?", "Dard kitna tez hai — halka, medium ya zyada?", "Kya aapko koi aur pareshani bhi hai, jaise ulti ya bukhar?", "Kya aap koi dawai le rahe hain?"],
  en: ["Since when have you had this problem?", "How severe is the pain — mild, moderate or severe?", "Do you have any other symptoms, like vomiting or fever?", "Are you taking any medicines?"],
};
const GREET = {
  hi: "नमस्ते! आपको किस तरह की परेशानी हो रही है?",
  hinglish: "Namaste! Aapko kis tarah ki pareshani ho rahi hai?",
  en: "Hello! What kind of problem are you having?",
};
const SUMMARY = {
  hi: "मरीज़ ने पेट में दर्द की शिकायत बताई है। यह AI द्वारा बनाया गया सारांश है, निदान नहीं।",
  hinglish: "Patient ne pet mein dard ki shikayat batayi hai. Yeh AI dwara banaya gaya summary hai, diagnosis nahi.",
  en: "The patient reports stomach pain. This is an AI-generated summary for review, not a diagnosis.",
};

const langOf = (instr) => (instr.includes("selected HINDI") ? "hi" : instr.includes("selected HINGLISH") ? "hinglish" : "en");

function respond(body) {
  const instr = body.instructions ?? "";
  const turns = body.input ?? [];
  const last = turns[turns.length - 1];
  const lastText = (last?.content ?? []).map((c) => c.text ?? "").join("\n");
  const lang = langOf(instr);

  if (instr.includes("case briefing")) {
    if (lastText.includes("ALWAYS_ENGLISH_SUMMARY")) return { summary: SUMMARY.en };
    return { summary: SUMMARY[lang] };
  }

  if (instr.includes("careful READER")) {
    const img = (last?.content ?? []).find((c) => c.type === "input_image");
    if (img) {
      if (img.image_url.length < 400) return { readable: false, documentType: "unknown", transcribedText: "", findings: [], summary: "", highlights: [], followUpQuestions: [], uncertainOrMissing: [] };
      return {
        readable: true, documentType: "blood_test",
        transcribedText: "Hemoglobin 11.4 g/dL 12.0 - 15.5\nGlucose (F) 104 mg/dL 70 - 99",
        findings: [
          { name: "Hemoglobin", value: "11.4", unit: "g/dL", referenceRange: "12.0 - 15.5", uncertain: false },
          { name: "Glucose (F)", value: "104", unit: "mg/dL", referenceRange: "70 - 99", uncertain: false },
        ],
        summary: SUMMARY[lang], highlights: ["Report prints reference ranges"], followUpQuestions: ["Has a doctor discussed this report with you?"], uncertainOrMissing: [],
      };
    }
    // text mode: report whatever "Hemoglobin x" line exists, PLUS a hallucinated finding that is NOT in the document
    const m = /Hemoglobin\s+([\d.]+)/.exec(lastText);
    const findings = [];
    if (m) findings.push({ name: "Hemoglobin", value: m[1], unit: "g/dL", referenceRange: "12.0 - 15.5", uncertain: false });
    findings.push({ name: "Vitamin D", value: "26", unit: "ng/mL", referenceRange: "30 - 100", uncertain: false }); // hallucination
    return { readable: true, documentType: "blood_test", transcribedText: "", findings, summary: SUMMARY[lang], highlights: [], followUpQuestions: ["Do you take any supplements?"], uncertainOrMissing: [] };
  }

  // Interview
  if (lastText.includes("consultation is starting")) return { caseState: {}, status: "ongoing", reply: GREET[lang] };

  const patientMsg = /<patient_message>\n([\s\S]*?)\n<\/patient_message>/.exec(lastText)?.[1] ?? "";
  const asked = turns.filter((t) => t.role === "assistant").length;
  const retry = lastText.includes("previous reply was rejected");
  const n = Math.min(asked, Q.en.length - 1);
  let reply = Q[lang][n];
  if (patientMsg.includes("ALWAYS_ENGLISH") || (patientMsg.includes("FORCE_ENGLISH") && !retry)) reply = Q.en[n];
  const state = patientMsg.includes("BLANK_STATE")
    ? { chiefComplaint: "", duration: "", symptoms: [] }
    : { chiefComplaint: "pet mein dard", duration: asked >= 1 ? "5 din" : "", symptoms: ["pet dard"], unanswered: lastText.includes("SKIP") ? ["allergies"] : [] };
  let status = "ongoing";
  if (patientMsg.includes("MODEL_EMERGENCY")) status = "emergency";
  if (patientMsg.includes("COMPLETE")) status = "complete";
  return { caseState: state, status, reply };
}

export function startMock() {
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      calls.push({ headers: req.headers, body });
      const out = JSON.stringify(respond(body));
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const mid = Math.floor(out.length / 2);
      res.write(`data: ${JSON.stringify({ type: "response.output_text.delta", delta: out.slice(0, mid) })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "response.output_text.delta", delta: out.slice(mid) })}\n\n`);
      res.end(`data: ${JSON.stringify({ type: "response.completed", response: {} })}\n\ndata: [DONE]\n\n`);
    });
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startMock();
  console.log(`mock gateway on ${PORT}`);
}
