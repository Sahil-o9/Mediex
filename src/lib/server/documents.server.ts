import type { Lang } from "@/lib/i18n/dictionary";
import { computeFlag, verificationFor } from "@/lib/mediex/findings";
import { MAX_FILE_BYTES } from "@/lib/mediex/documents";
import type {
  DocumentAnalysis,
  DocumentFinding,
  DocumentNotice,
  DocumentType,
  ExtractionMethod,
} from "@/types/consult";
import { AiError, callModel, extractJson, getAiConfig, userText, type AiTurn } from "./ai.server";
import { buildDocumentPrompt } from "./prompts.server";

/**
 * Document processing pipeline (nothing here is persisted — bytes live only for the request):
 *
 *   validate (size + REAL file signature, not the client's claim)
 *     ├─ PDF  → extract the text layer (unpdf) → AI reads the text
 *     └─ image → vision model transcribes + reads it
 *   → sanitise AI output → verify every value against the source text
 *   → compute below/above/within flags IN CODE against the report's own printed range
 *
 * If a document cannot be read, we say so. We never fill in values.
 */

export type SniffedType = "pdf" | "png" | "jpeg";

export function sniffType(bytes: Uint8Array): SniffedType | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return "pdf";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  return null;
}

export const MIME_FOR: Record<SniffedType, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpeg: "image/jpeg",
};

export type AnalyzeErrorCode =
  | "unsupported_type"
  | "too_large"
  | "empty_file"
  | "unreadable_pdf" // PDF has no text layer (scan) — cannot be OCR'd here
  | "pdf_parse_failed"
  | "unreadable_image" // AI could not read the image reliably
  | "ai_not_configured"
  | "rate_limit"
  | "credits"
  | "blocked"
  | "ai_error";

export type AnalyzeResult =
  | { ok: true; analysis: DocumentAnalysis }
  | { ok: false; error: AnalyzeErrorCode };

const MAX_TEXT_FOR_AI = 24_000;
const MAX_STORED_TEXT = 30_000;
const MIN_TEXT_LAYER = 40;

const s = (x: unknown, max = 300): string => (typeof x === "string" ? x.trim().slice(0, max) : "");
const list = (x: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(x)
    ? [...new Set(x.filter((i): i is string => typeof i === "string").map((i) => i.trim().slice(0, maxLen)).filter(Boolean))].slice(0, maxItems)
    : [];

const DOC_TYPES: DocumentType[] = ["blood_test", "prescription", "medical_record", "imaging_report", "other", "unknown"];

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).replace(/\u0000/g, "").trim();
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

interface RawAnalysis {
  readable?: unknown;
  documentType?: unknown;
  transcribedText?: unknown;
  findings?: unknown;
  summary?: unknown;
  highlights?: unknown;
  followUpQuestions?: unknown;
  uncertainOrMissing?: unknown;
}

/** Turns untrusted model output into a bounded, verified DocumentAnalysis. Exported for tests. */
export function buildAnalysis(
  raw: RawAnalysis,
  method: ExtractionMethod,
  sourceText: string,
  notices: DocumentNotice[],
): DocumentAnalysis {
  const documentType = DOC_TYPES.includes(raw.documentType as DocumentType) ? (raw.documentType as DocumentType) : "unknown";

  const findings: DocumentFinding[] = [];
  if (Array.isArray(raw.findings)) {
    for (const item of raw.findings.slice(0, 60)) {
      if (!item || typeof item !== "object") continue;
      const f = item as Record<string, unknown>;
      const name = s(f["name"], 120);
      const value = s(f["value"], 80);
      if (!name || !value) continue; // never keep a finding without both
      const unit = s(f["unit"], 30);
      const referenceRange = s(f["referenceRange"], 60);
      const verification = verificationFor(method, name, value, sourceText);
      findings.push({
        id: `F${findings.length + 1}`,
        name,
        value,
        unit,
        referenceRange,
        flag: computeFlag(value, referenceRange),
        verification,
        uncertain: f["uncertain"] === true || verification !== "matched_in_text",
      });
    }
  }

  const finalNotices = [...notices];
  if (findings.length === 0) finalNotices.push("no_findings");

  return {
    documentType,
    method,
    extractedText: sourceText.slice(0, MAX_STORED_TEXT),
    findings,
    summary: s(raw.summary, 900),
    highlights: list(raw.highlights, 5, 220),
    followUpQuestions: list(raw.followUpQuestions, 4, 220),
    uncertainOrMissing: list(raw.uncertainOrMissing, 8, 220),
    aiAnalysed: true,
    notices: finalNotices,
  };
}

function mapAiError(err: unknown): AnalyzeErrorCode {
  if (err instanceof AiError) {
    if (err.code === "not_configured") return "ai_not_configured";
    if (err.code === "rate_limit" || err.code === "credits" || err.code === "blocked") return err.code;
  }
  return "ai_error";
}

export async function analyzeDocument(input: { bytes: Uint8Array; lang: Lang }): Promise<AnalyzeResult> {
  const { bytes, lang } = input;
  if (bytes.length === 0) return { ok: false, error: "empty_file" };
  if (bytes.length > MAX_FILE_BYTES) return { ok: false, error: "too_large" };
  const type = sniffType(bytes);
  if (!type) return { ok: false, error: "unsupported_type" };

  /* ------------------------------ PDF ------------------------------ */
  if (type === "pdf") {
    let text: string;
    try {
      text = await extractPdfText(bytes);
    } catch {
      return { ok: false, error: "pdf_parse_failed" };
    }
    if (text.replace(/\s+/g, "").length < MIN_TEXT_LAYER) {
      return { ok: false, error: "unreadable_pdf" };
    }

    const notices: DocumentNotice[] = [];
    let forAi = text;
    if (text.length > MAX_TEXT_FOR_AI) {
      forAi = text.slice(0, MAX_TEXT_FOR_AI);
      notices.push("text_truncated");
    }

    const textOnly = (notice: DocumentNotice): AnalyzeResult => ({
      ok: true,
      analysis: {
        documentType: "unknown",
        method: "pdf_text",
        extractedText: text.slice(0, MAX_STORED_TEXT),
        findings: [],
        summary: "",
        highlights: [],
        followUpQuestions: [],
        uncertainOrMissing: [],
        aiAnalysed: false,
        notices: [...notices, notice],
      },
    });

    if (!getAiConfig()) return textOnly("ai_not_configured");

    try {
      const out = await callModel({
        instructions: buildDocumentPrompt(lang, "text"),
        input: [userText(`<document>\n${forAi}\n</document>\n\nRead this document and reply with the JSON object only.`)],
        timeoutMs: 60_000,
      });
      const parsed = extractJson(out) as RawAnalysis | null;
      if (!parsed) return textOnly("ai_failed");
      return { ok: true, analysis: buildAnalysis(parsed, "pdf_text", text, notices) };
    } catch {
      // The extracted text is still real and useful; only the AI reading failed.
      return textOnly("ai_failed");
    }
  }

  /* ----------------------------- image ----------------------------- */
  if (!getAiConfig()) return { ok: false, error: "ai_not_configured" };
  const dataUrl = `data:${MIME_FOR[type]};base64,${toBase64(bytes)}`;
  const turn: AiTurn = {
    role: "user",
    content: [
      { type: "input_text", text: "Read this document image and reply with the JSON object only." },
      { type: "input_image", image_url: dataUrl },
    ],
  };
  try {
    const out = await callModel({ instructions: buildDocumentPrompt(lang, "image"), input: [turn], timeoutMs: 90_000 });
    const parsed = extractJson(out) as RawAnalysis | null;
    if (!parsed) return { ok: false, error: "ai_error" };
    const transcript = s(parsed.transcribedText, MAX_STORED_TEXT);
    if (parsed.readable !== true || transcript.length < 10) return { ok: false, error: "unreadable_image" };
    return { ok: true, analysis: buildAnalysis(parsed, "image_vision", transcript, []) };
  } catch (err) {
    return { ok: false, error: mapAiError(err) };
  }
}
