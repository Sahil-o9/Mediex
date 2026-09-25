import type { Lang } from "@/lib/i18n/dictionary";
import type {
  DocumentFinding,
  DocumentType,
  ExtractionMethod,
  FindingFlag,
  FindingVerification,
  IncludedDocument,
  PatientDetails,
  Sex,
} from "@/types/consult";
import { ID_PATTERN } from "./store.server";

/** Bounds and coerces untrusted client input. Everything from the browser goes through here. */

export const str = (x: unknown, max: number): string => (typeof x === "string" ? x.trim().slice(0, max) : "");
export const strList = (x: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(x) ? x.filter((i): i is string => typeof i === "string").map((i) => i.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems) : [];

export function asLang(x: unknown): Lang {
  return x === "hi" || x === "hinglish" ? x : "en";
}

const DOC_TYPES: DocumentType[] = ["blood_test", "prescription", "medical_record", "imaging_report", "other", "unknown"];
const METHODS: ExtractionMethod[] = ["pdf_text", "image_vision"];
const FLAGS: FindingFlag[] = ["below_range", "above_range", "within_range", "not_comparable"];
const VERIFS: FindingVerification[] = ["matched_in_text", "read_from_image", "not_verified"];
const MIMES = ["application/pdf", "image/jpeg", "image/png"];
const SEXES: Sex[] = ["male", "female", "other", "prefer_not", ""];

export function sanitizeDetails(x: unknown): PatientDetails {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const age = typeof o["age"] === "number" && Number.isFinite(o["age"]) && o["age"] >= 0 && o["age"] <= 120 ? Math.floor(o["age"]) : null;
  return {
    name: str(o["name"], 120),
    patientId: str(o["patientId"], 40),
    age,
    sex: SEXES.includes(o["sex"] as Sex) ? (o["sex"] as Sex) : "",
    contact: str(o["contact"], 80),
  };
}

function sanitizeFinding(x: unknown, i: number): DocumentFinding | null {
  if (!x || typeof x !== "object") return null;
  const f = x as Record<string, unknown>;
  const name = str(f["name"], 120);
  const value = str(f["value"], 80);
  if (!name || !value) return null;
  return {
    id: str(f["id"], 20) || `F${i + 1}`,
    name,
    value,
    unit: str(f["unit"], 30),
    referenceRange: str(f["referenceRange"], 60),
    flag: FLAGS.includes(f["flag"] as FindingFlag) ? (f["flag"] as FindingFlag) : "not_comparable",
    verification: VERIFS.includes(f["verification"] as FindingVerification) ? (f["verification"] as FindingVerification) : "not_verified",
    uncertain: f["uncertain"] === true,
  };
}

export function sanitizeIncludedDocuments(x: unknown, max = 5): IncludedDocument[] {
  if (!Array.isArray(x)) return [];
  const out: IncludedDocument[] = [];
  for (const item of x.slice(0, max)) {
    if (!item || typeof item !== "object") continue;
    const d = item as Record<string, unknown>;
    const id = typeof d["id"] === "string" && ID_PATTERN.test(d["id"]) ? d["id"] : `DOC-${out.length + 1}0000`;
    out.push({
      id,
      fileName: str(d["fileName"], 200) || "document",
      mime: MIMES.includes(d["mime"] as string) ? (d["mime"] as string) : "application/octet-stream",
      size: typeof d["size"] === "number" && d["size"] >= 0 ? Math.floor(d["size"]) : 0,
      documentType: DOC_TYPES.includes(d["documentType"] as DocumentType) ? (d["documentType"] as DocumentType) : "unknown",
      method: METHODS.includes(d["method"] as ExtractionMethod) ? (d["method"] as ExtractionMethod) : "pdf_text",
      extractedText: str(d["extractedText"], 30_000),
      findings: (Array.isArray(d["findings"]) ? d["findings"] : []).slice(0, 60).map(sanitizeFinding).filter((f): f is DocumentFinding => f !== null),
      summary: str(d["summary"], 900),
      highlights: strList(d["highlights"], 5, 220),
      uncertainOrMissing: strList(d["uncertainOrMissing"], 8, 220),
      aiAnalysed: d["aiAnalysed"] === true,
      shareOriginal: d["shareOriginal"] === true,
    });
  }
  return out;
}
