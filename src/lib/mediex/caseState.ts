import { EMPTY_CASE_STATE, type CaseState } from "@/types";

const MAX_STR = 600;
const MAX_ITEMS = 30;

const str = (x: unknown): string => (typeof x === "string" ? x.trim().slice(0, MAX_STR) : "");
const arr = (x: unknown): string[] =>
  Array.isArray(x)
    ? x
        .filter((i): i is string => typeof i === "string")
        .map((i) => i.trim().slice(0, MAX_STR))
        .filter(Boolean)
        .slice(0, MAX_ITEMS)
    : [];

/** Coerces untrusted input (client body or model output) into a valid, size-bounded CaseState. */
export function asCaseState(value: unknown): CaseState {
  if (!value || typeof value !== "object") return { ...EMPTY_CASE_STATE };
  const v = value as Partial<Record<keyof CaseState, unknown>>;
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
    unanswered: arr(v.unanswered),
  };
}

function union(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...a, ...b]) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out.slice(0, MAX_ITEMS);
}

/**
 * Merges the model's returned case state into the previous one.
 * The model is asked to return the FULL state each turn, but a model can
 * accidentally blank a field — so an empty value never erases a known fact,
 * and lists only grow. A non-empty new value refines the old one.
 */
export function mergeCaseState(prev: CaseState, next: CaseState): CaseState {
  const pick = (a: string, b: string) => (b ? b : a);
  return {
    chiefComplaint: pick(prev.chiefComplaint, next.chiefComplaint),
    symptoms: union(prev.symptoms, next.symptoms),
    duration: pick(prev.duration, next.duration),
    severity: pick(prev.severity, next.severity),
    location: pick(prev.location, next.location),
    associatedSymptoms: union(prev.associatedSymptoms, next.associatedSymptoms),
    history: pick(prev.history, next.history),
    medicines: pick(prev.medicines, next.medicines),
    allergies: pick(prev.allergies, next.allergies),
    lifestyle: pick(prev.lifestyle, next.lifestyle),
    ayurvedic: pick(prev.ayurvedic, next.ayurvedic),
    redFlags: union(prev.redFlags, next.redFlags),
    unanswered: union(prev.unanswered, next.unanswered),
  };
}

/** Core topics used for the patient-facing progress bar. */
export function computeProgress(cs: CaseState): { done: number; total: number; percent: number } {
  const topics = [
    cs.chiefComplaint,
    cs.duration,
    cs.severity,
    cs.associatedSymptoms.length > 0 ? "x" : "",
    cs.history,
    cs.medicines,
    cs.allergies,
    cs.lifestyle,
  ];
  const total = topics.length;
  const filled = topics.filter(Boolean).length;
  // A skipped / "don't know" topic still counts as covered so progress can finish.
  const done = Math.min(total, filled + Math.min(cs.unanswered.length, total - filled));
  return { done, total, percent: Math.round((done / total) * 100) };
}

/**
 * Items an Ayurvedic practitioner assesses by examination. The AI does NOT
 * assess or infer these; the summary lists them as pending for the doctor.
 */
export const CLINICIAN_ASSESSED = {
  ashtavidha: ["Nadi", "Mutra", "Mala", "Jihva", "Shabda", "Sparsha", "Drik", "Akriti"],
  dashavidha: [
    "Prakriti",
    "Vikriti",
    "Sara",
    "Samhanana",
    "Pramana",
    "Satmya",
    "Satva",
    "Ahara shakti",
    "Vyayama shakti",
    "Vaya",
  ],
} as const;
