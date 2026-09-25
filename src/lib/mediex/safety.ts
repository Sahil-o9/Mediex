/**
 * Deterministic, multilingual emergency pre-screen.
 *
 * This is a SAFETY NET that runs on the server BEFORE the AI is called (and on
 * the client when the AI is unreachable). It does not replace the AI's own
 * judgement — it guarantees that clearly urgent phrases in English, Hindi
 * (Devanagari) and Hinglish (Roman Hindi) always reach the patient with the
 * "seek care now" message, even if the model is down or misbehaves.
 *
 * It is deliberately HIGH-PRECISION on negation: when a doctor's screening
 * question gets the answer "no chest pain" / "seene mein dard nahi hai", that
 * must not end the interview.
 */

interface Pattern {
  re: RegExp;
  /** Phrases that are often mentioned as PAST history ("heart attack 2 years ago"). */
  history?: boolean;
}

// Devanagari notes: \u093C is the nukta; \u0901/\u0902 are chandrabindu/anusvara.
const SAANS = "सा[\\u0901\\u0902]?स";
const TAKLEEF = "(?:तकलीफ\\u093C?|दिक्कत|परेशानी)";

const PATTERNS: Pattern[] = [
  // ---- English ----
  { re: /\bchest (?:pain|pressure|tightness|discomfort)\b/i },
  { re: /\bpain in (?:my |the )?chest\b/i },
  { re: /\bheart attack\b/i, history: true },
  { re: /\b(?:can'?t|cannot|unable to|difficulty|trouble|struggling to) breath(?:e|ing)\b/i },
  { re: /\bshort(?:ness)? of breath\b/i },
  { re: /\bbreathless(?:ness)?\b/i },
  { re: /\b(?:severe|heavy|uncontrolled|profuse) bleeding\b/i },
  { re: /\bbleeding (?:a lot|heavily|profusely|won'?t stop)\b/i },
  { re: /\b(?:vomit(?:ing|ed)?|cough(?:ing|ed)?(?: up)?|spitting) (?:up )?blood\b/i },
  { re: /\b(?:unconscious|passed out|fainted|collapsed|lost consciousness|blacked out)\b/i },
  { re: /\b(?:seizures?|convulsions?)\b/i, history: true },
  { re: /\bstroke\b/i, history: true },
  { re: /\bface (?:is )?drooping\b/i },
  { re: /\bslurred speech\b/i },
  { re: /\bsudden(?:ly)? (?:weakness|numbness)\b/i },
  { re: /\b(?:suicid(?:e|al)|kill myself|end my life|want to die|self[- ]harm)\b/i },
  { re: /\b(?:poison(?:ed|ing)?|overdos(?:e|ed))\b/i },
  { re: /\b(?:swelling of (?:the )?(?:throat|face|tongue)|(?:throat|face|tongue) (?:is )?swelling)\b/i },
  { re: /\banaphyla/i },
  { re: /\bchoking\b/i },

  // ---- Hinglish (Roman Hindi) ----
  { re: /\b(?:seene|sine|chhati|chhaati|chati|chaati) (?:mein|me|m) (?:\w+ )?(?:dard|pain|jakdan|bhaari|bhari)\b/i },
  { re: /\bsaans (?:lene )?(?:mein|me) (?:bahut |bohot |bahot )?(?:takleef|dikkat|problem|taklif)\b/i },
  { re: /\bsaans (?:nahi|nhi|nahin) (?:le pa|aa|aata|le sak)/i },
  { re: /\bsaans phool/i },
  { re: /\b(?:behosh|behoshi)\b/i },
  { re: /\b(?:dil ka daura|mirgi)\b/i, history: true },
  { re: /\b(?:lakwa|laqwa)\b/i, history: true },
  { re: /\b(?:khoon (?:ki )?ulti|ulti (?:mein|me) khoon)\b/i },
  { re: /\b(?:bahut|zyada|jyada) khoon\b/i },
  { re: /\bkhoon (?:band )?(?:nahi|nhi) ruk/i },
  { re: /\b(?:zeher|jehar|jahar)\b/i },
  { re: /\b(?:khudkushi|aatmahatya)\b/i },
  { re: /\b(?:marna chahta|marna chahti|mar jana chahta|mar jaana chahta|jaan dena chahta|jaan dena chahti)\b/i },

  // ---- Hindi (Devanagari) ----
  { re: new RegExp(`(?:सीने|छाती|सीना)\\s*(?:में|मे)?\\s*(?:\\S+\\s+)?(?:दर्द|जकड़न|भारीपन)`) },
  { re: new RegExp(`${SAANS}\\s*(?:लेने\\s*)?(?:में|मे)\\s*(?:बहुत\\s*)?${TAKLEEF}`) },
  { re: new RegExp(`${SAANS}\\s*(?:नहीं|नही)\\s*(?:ले|आ)`) },
  { re: new RegExp(`${SAANS}\\s*फूल`) },
  { re: /बेहोश/ },
  { re: /(?:दिल\s*का\s*दौरा|हार्ट\s*अटैक|मिर्गी)/, history: true },
  { re: /(?:लकवा|पक्षाघात)/, history: true },
  { re: /(?:खून\s*की\s*उल्टी|उल्टी\s*(?:में|मे)\s*खून|बहुत\s*खून|खून\s*(?:नहीं|नही)\s*रुक)/ },
  { re: /ज\u093C?हर/ },
  { re: /(?:आत्महत्या|खुदकुशी|मरना\s*चाह|जान\s*देना\s*चाह)/ },
];

const NEGATION =
  /(?:\b(?:no|not|never|without|don'?t|doesn'?t|didn'?t|isn'?t|denies|nahi|nahin|nhi|bina)\b|नहीं|नही|बिना)/i;

const PAST_MARKER =
  /(?:\b(?:ago|last year|years back|months back|in the past|previously|history of|pehle|pichhle|pichle|purana)\b|पहले|पिछले|साल\s*पहले)/i;

const CLAUSE_BREAK =
  /[,;.।!?\n]+|\s(?:and|but|aur|lekin|magar|par|however)\s|\s(?:और|लेकिन|मगर|पर)\s/gi;

function clauseAround(text: string, start: number, end: number): { pre: string; post: string } {
  let clauseStart = 0;
  let clauseEnd = text.length;
  CLAUSE_BREAK.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLAUSE_BREAK.exec(text)) !== null) {
    const bStart = m.index;
    const bEnd = m.index + m[0].length;
    if (bEnd <= start) clauseStart = bEnd;
    else if (bStart >= end) {
      clauseEnd = bStart;
      break;
    }
    if (m[0].length === 0) CLAUSE_BREAK.lastIndex++;
  }
  return { pre: text.slice(clauseStart, start), post: text.slice(end, clauseEnd) };
}

export interface EmergencyResult {
  emergency: boolean;
  matched: string | null;
}

export function detectEmergency(input: string): EmergencyResult {
  const text = input.normalize("NFC");
  for (const { re, history } of PATTERNS) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const scan = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = scan.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      // Negators that are part of the matched phrase itself ("saans nahi le pa raha") don't count.
      const { pre, post } = clauseAround(text, start, end);
      const negated = NEGATION.test(pre) || NEGATION.test(post);
      const past = history === true && PAST_MARKER.test(pre + " " + post);
      if (!negated && !past) return { emergency: true, matched: m[0] };
      if (m[0].length === 0) scan.lastIndex++;
    }
  }
  return { emergency: false, matched: null };
}
