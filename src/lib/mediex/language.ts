import type { Lang } from "@/lib/i18n/dictionary";

/**
 * Checks that an AI reply is actually written in the language the patient
 * selected. The prompt asks for this, but a model can drift — so the server
 * verifies it and retries once instead of showing the patient a reply in the
 * wrong language.
 *
 *  hi       – mostly Devanagari (English medical terms in brackets are allowed)
 *  hinglish – Roman script only, with Hindi function words present
 *  en       – Roman script, no Devanagari, no run of romanised-Hindi words
 */

const DEVANAGARI = /[\u0900-\u097F]/g;
const LATIN = /[A-Za-z]/g;

// Romanised-Hindi function words that are not ordinary English words.
const HINGLISH_MARKERS = [
  "aap", "aapko", "aapka", "aapki", "aapke", "kya", "hai", "hain", "ho", "raha", "rahi",
  "mein", "kab", "kitna", "kitne", "kaise", "kahan", "kis", "nahi", "nahin", "se", "ka", "ki", "ke",
  "pareshani", "takleef", "dard", "pet", "sir",
];
const STRICT_HINDI_WORDS = new Set([
  "aapko", "aapka", "aapki", "aapke", "kya", "hai", "hain", "mein", "kab", "kitna", "kitne",
  "kaise", "nahi", "nahin", "pareshani", "takleef", "raha", "rahi",
]);

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

export interface LanguageCheck {
  ok: boolean;
  reason?: "not_devanagari" | "has_devanagari" | "not_hinglish" | "looks_hinglish" | "empty";
}

export function checkReplyLanguage(text: string, lang: Lang): LanguageCheck {
  const dev = countMatches(text, DEVANAGARI);
  const lat = countMatches(text, LATIN);
  if (dev + lat === 0) return { ok: false, reason: "empty" };

  if (lang === "hi") {
    return dev / (dev + lat) >= 0.5 ? { ok: true } : { ok: false, reason: "not_devanagari" };
  }

  if (dev > 0) {
    return { ok: false, reason: "has_devanagari" };
  }

  const ws = words(text);
  if (lang === "hinglish") {
    if (ws.length < 4) return { ok: true };
    const hits = ws.filter((w) => HINGLISH_MARKERS.includes(w)).length;
    return hits >= 1 ? { ok: true } : { ok: false, reason: "not_hinglish" };
  }

  // English: reject clearly romanised-Hindi text.
  const strictHits = ws.filter((w) => STRICT_HINDI_WORDS.has(w)).length;
  return strictHits >= 2 ? { ok: false, reason: "looks_hinglish" } : { ok: true };
}
