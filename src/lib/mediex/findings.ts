import type { DocumentFinding, FindingFlag, FindingVerification } from "@/types/consult";

/**
 * Deterministic helpers for document findings.
 *
 * The AI is only allowed to READ what a document states. Everything that
 * looks like an interpretation is computed here, in code, so it can't be
 * hallucinated:
 *   - the below/above/within flag is computed only against the reference
 *     range printed ON THE REPORT — never against a range the model knows;
 *   - each finding is verified to literally appear in the source text.
 */

const DASHES = /[\u2010-\u2015\u2212]/g;

/** Parses a plain number like "11.4" or "1,200". Returns null for "<5", "Negative", "12 ± 2", etc. */
export function parseNumber(raw: string): number | null {
  const s = raw.replace(DASHES, "-").replace(/,/g, "").trim();
  const m = /^-?\d+(?:\.\d+)?$/.exec(s);
  return m ? Number(s) : null;
}

export interface ParsedRange {
  low?: number;
  high?: number;
}

/**
 * Parses reference ranges as printed on lab reports:
 * "12.0 - 15.5", "70 to 99", "< 200", "<= 5.0", "> 40", "up to 5".
 */
export function parseRange(raw: string): ParsedRange | null {
  const s = raw
    .replace(DASHES, "-")
    .replace(/,/g, "")
    .replace(/[a-zA-Zµ%/°]+(?:\/[a-zA-Z]+)*/g, (unit) =>
      /^(?:to|upto|up)$/i.test(unit) ? unit : " ",
    )
    .trim();

  let m = /^(-?\d+(?:\.\d+)?)\s*(?:-|to)\s*(-?\d+(?:\.\d+)?)$/i.exec(s);
  if (m) {
    const low = Number(m[1]);
    const high = Number(m[2]);
    return low <= high ? { low, high } : null;
  }
  m = /^(?:<|<=|≤|up\s*to|upto)\s*(-?\d+(?:\.\d+)?)$/i.exec(s);
  if (m) return { high: Number(m[1]) };
  m = /^(?:>|>=|≥)\s*(-?\d+(?:\.\d+)?)$/i.exec(s);
  if (m) return { low: Number(m[1]) };
  return null;
}

export function computeFlag(value: string, referenceRange: string): FindingFlag {
  const v = parseNumber(value);
  const r = parseRange(referenceRange);
  if (v === null || r === null) return "not_comparable";
  if (r.low !== undefined && v < r.low) return "below_range";
  if (r.high !== undefined && v > r.high) return "above_range";
  return "within_range";
}

function compact(s: string): string {
  return s
    .toLowerCase()
    .replace(DASHES, "-")
    .replace(/[\s\u200b\u00a0]+/g, "");
}

/** True when the value and the first word of the test name literally appear in the source text. */
export function appearsInText(name: string, value: string, sourceText: string): boolean {
  const hay = compact(sourceText);
  const v = compact(value);
  const firstWord = compact(name.split(/[\s(/,-]+/).find((w) => w.length >= 3) ?? name);
  if (v.length === 0 || firstWord.length === 0) return false;
  return hay.includes(v) && hay.includes(firstWord);
}

export function verificationFor(
  method: "pdf_text" | "image_vision",
  name: string,
  value: string,
  sourceText: string,
): FindingVerification {
  if (method === "image_vision") return "read_from_image";
  return appearsInText(name, value, sourceText) ? "matched_in_text" : "not_verified";
}

export function isUncertain(f: Pick<DocumentFinding, "verification">, aiSaidUncertain: boolean) {
  return aiSaidUncertain || f.verification !== "matched_in_text";
}
