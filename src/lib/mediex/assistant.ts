/**
 * Health Assistant with 20 predefined Q&A entries.
 * Fully local, no API calls, no API keys.
 * Responses are general, safety-first information only.
 *
 * Replace `askAssistant` with a real API call later — the signature stays the same.
 */

/**
 * 20 suggested questions covering general health topics
 */
export const suggestedQuestions = [
  "What should I do for a fever?",
  "How do I manage a cold and cough?",
  "What causes headaches and how can I help myself?",
  "What should I do about stomach pain?",
  "How do I monitor my blood pressure at home?",
  "What are the basics of managing diabetes?",
  "What makes a healthy diet?",
  "How much exercise do I need?",
  "How can I improve my sleep?",
  "How do I manage stress and anxiety?",
  "When should I consult a doctor?",
  "What are emergency warning signs?",
  "How do I understand my blood test report?",
  "Why is hydration important?",
  "How do I manage seasonal allergies?",
  "What are basic skin care tips?",
  "What are Ayurveda's general lifestyle principles?",
  "What is a safe daily routine according to Ayurveda?",
  "What are the basics of yoga and breathing?",
  "When should I not rely on home remedies?",
];

/**
 * Knowledge base: 20 entries with safe, general information
 * Each entry has a regex pattern to match user questions
 */
const KNOWLEDGE: { match: RegExp; answer: string }[] = [
  // 1. Fever
  {
    match: /fever|temperature|jwar|body heat/i,
    answer:
      "General guidance for a mild fever: rest, sip fluids regularly (water, herbal teas), and keep the room cool. Track your temperature two or three times a day and note any other symptoms. Most fevers resolve within 3–5 days. Seek in-person care if fever exceeds 103°F (39.4°C), lasts more than 5 days, or comes with severe headache, difficulty breathing, or chest pain.",
  },

  // 2. Cold and Cough
  {
    match: /cough|cold|sore throat|flu|throat pain|congestion/i,
    answer:
      "For a common cold: warm fluids (tea, soup, water), salt-water gargles (1/2 teaspoon salt in warm water), steam inhalation, and rest usually help over 5–7 days. Use a humidifier to ease congestion. See a clinician if you have breathlessness, chest pain, a cough lasting over three weeks, or high fever. Do not self-prescribe antibiotics—they do not treat viral colds.",
  },

  // 3. Headache
  {
    match: /headache|migraine|head pain|temple pain/i,
    answer:
      "Frequent headaches often respond to regular meals, steady hydration, consistent sleep, screen breaks, and lower caffeine. Note the time, trigger, and duration of each episode. Rest in a quiet, dark space. Warm or cold compresses may help. Get checked urgently if headache is sudden, severe, or accompanied by fever, confusion, vision changes, or weakness.",
  },

  // 4. Stomach Pain
  {
    match: /stomach pain|abdominal|belly|digestive|indigestion|gut/i,
    answer:
      "For mild stomach discomfort: rest, sip clear fluids, eat bland foods (rice, toast, bananas), and avoid spicy or fatty foods. Ginger or peppermint tea may soothe. Seek immediate care if pain is severe, accompanied by vomiting blood, black stools, fever above 102°F (38.9°C), or lasts over a week. Persistent pain needs professional evaluation.",
  },

  // 5. Blood Pressure
  {
    match: /blood pressure|bp|hypertension|blood pressure management/i,
    answer:
      "Home BP readings are most useful when taken while seated and rested, at the same time each day, and written down. Reducing salt, staying active (30 minutes most days), managing stress, and taking prescribed medicines as directed help control pressure. Normal BP is below 120/80 mmHg. Share home readings with your doctor. Do not skip medications without consulting your doctor.",
  },

  // 6. Diabetes Basics
  {
    match: /diabetes|blood sugar|glucose|sugar level|insulin/i,
    answer:
      "Day-to-day diabetes care rests on consistent meal timing, portion control of refined carbohydrates, daily activity (even 10-minute walks), medication as prescribed, and regular monitoring. Annual eye, kidney, and foot check-ups are important. Keep a food and glucose diary. Always follow your doctor's or diabetes educator's plan—home information cannot replace personalized medical guidance.",
  },

  // 7. Healthy Diet
  {
    match: /diet|healthy eating|nutrition|nutrition plan|food|what to eat/i,
    answer:
      "A balanced diet includes vegetables (half your plate), whole grains, pulses/beans, and protein (eggs, fish, chicken, tofu). Limit added sugars, ultra-processed foods, and excess salt. Drink water instead of sugary drinks. Portion control matters as much as food choice. Eating slowly and mindfully helps digestion. Consult a registered dietitian for a plan tailored to your health.",
  },

  // 8. Exercise
  {
    match: /exercise|fitness|workout|activity|physical activity|sport/i,
    answer:
      "Aim for 150 minutes of moderate activity per week (e.g., brisk walking, cycling) or 75 minutes of vigorous activity (e.g., running, fast swimming). Add strength work 2 days per week. Start slowly and build up. Exercise improves energy, sleep, mood, and heart health. If you have chest pain, severe shortness of breath, or chronic disease, consult your doctor before starting.",
  },

  // 9. Sleep
  {
    match: /sleep|insomnia|sleepless|tired|fatigue|rest/i,
    answer:
      "Aim for 7–9 hours nightly. Keep a regular schedule (same bedtime and wake time, even weekends), avoid screens 1 hour before bed, keep your bedroom cool and dark, and limit caffeine after 2 p.m. Exercise helps, but not within 3 hours of bedtime. If sleeplessness lasts weeks or affects work, see a doctor. Do not self-prescribe sleeping pills.",
  },

  // 10. Stress and Anxiety
  {
    match: /stress|anxiety|worry|depressed|depression|mental health/i,
    answer:
      "Steady sleep and wake times, daylight exposure, movement, and talking to someone you trust all help with mood and stress. Deep breathing (4-count inhale, 4-count exhale) and short meditation can calm quickly. If low mood, worry, or sleeplessness lasts more than two weeks or affects work and relationships, reach out to a counselor or doctor. Professional support is a sign of strength, not weakness.",
  },

  // 11. When to See a Doctor
  {
    match: /consult|see a doctor|doctor|when should i|visit doctor/i,
    answer:
      "Book a consultation if a symptom is severe, keeps getting worse, lasts longer than a week, or interferes with sleep, eating, or work. Also see a doctor for regular check-ups (even when well), before starting new exercise, after a significant life change, or for any persistent concern. Early consultation can prevent complications. Do not delay if you suspect a serious condition.",
  },

  // 12. Emergency Warning Signs
  {
    match:
      /emergency|chest pain|breathing|severe bleed|stroke|fainting|allergic|choking|poisoning|severe injury/i,
    answer:
      "🚨 SEEK EMERGENCY CARE IMMEDIATELY if you experience: chest pain or pressure, shortness of breath, severe bleeding, signs of stroke (sudden weakness, speech problems, facial drooping), loss of consciousness, severe allergic reaction (swelling of face/throat, difficulty breathing), or severe injuries. Call emergency services or go to the nearest emergency room. Do not drive yourself if severely unwell.",
  },

  // 13. Understanding Blood Test Reports
  {
    match: /blood test|report|hemoglobin|hb|cbc|lipid|cholesterol|sugar|glucose|tsh/i,
    answer:
      "Blood reports usually list a measured value next to a reference range. A value inside the range is generally considered normal for that lab; slightly outside is common and often not serious. Different labs have slightly different ranges. Do not diagnose yourself—always ask your doctor to explain any abnormal values. Some values require follow-up tests or lifestyle changes; your doctor will advise.",
  },

  // 14. Hydration
  {
    match: /hydration|water|dehydration|drinking water|fluid intake/i,
    answer:
      "Drink enough water to keep urine pale yellow. A common rule is 8 glasses a day, but needs vary by activity, climate, and health. More water is needed in hot weather, during exercise, and if you have fever or diarrhea. Thirst and dark urine are signs you need more fluids. Herbal tea, milk, and fruits with high water content (cucumber, watermelon) count. Limit sugary drinks and excessive caffeine.",
  },

  // 15. Seasonal Allergies
  {
    match: /allergy|allergen|pollen|seasonal|hay fever|itchy|sneezing|allergies/i,
    answer:
      "Seasonal allergies cause sneezing, itchy eyes, and runny nose when exposed to pollen or mold. Keep windows closed during high-pollen days, rinse nasal passages with salt water, and wear sunglasses outdoors. Regular cleaning reduces dust. Medications like antihistamines can help (available without prescription), but consult a pharmacist first. If symptoms worsen or breathing is affected, see a doctor. Allergy testing can identify specific triggers.",
  },

  // 16. Basic Skin Care
  {
    match: /skin|acne|dry skin|oily skin|eczema|dermatitis|rash|moisturize|skincare/i,
    answer:
      "Good skin care includes gentle cleansing twice daily, moisturizing (especially if skin is dry), and sun protection daily. Avoid harsh scrubbing. For acne, keep skin clean and avoid heavy makeup; benzoyl peroxide or salicylic acid (over-the-counter) may help mild cases. For rashes or persistent skin problems, see a dermatologist—do not self-treat without professional guidance. Hydration and adequate sleep also support skin health.",
  },

  // 17. Ayurveda: General Lifestyle Principles
  {
    match: /ayurveda|ayurvedic|vata|pitta|kapha|dosha|traditional/i,
    answer:
      "Ayurveda emphasizes balance through diet, routine, and seasonal adjustments. It recognizes three doshas: Vata (air/ether), Pitta (fire/water), and Kapha (water/earth). Eating seasonally, following a daily routine (wake, sleep at consistent times), and living in harmony with nature are core principles. Yoga and meditation are valued. Important: Ayurvedic practices support wellbeing but do not cure serious diseases. Always combine traditional wisdom with modern medical care.",
  },

  // 18. Ayurveda: Safe Daily Routine
  {
    match: /ayurveda|routine|dincharya|daily|morning|evening|ritual|practice/i,
    answer:
      "A balanced Ayurvedic routine includes: waking before sunrise, drinking warm water with lemon, gentle self-massage (abhyanga) with oil, exercising or yoga, regular meal times (largest meal at midday), evening wind-down, and early sleep. This supports digestion and calm. Adjust based on your dosha and season. Consistency matters more than intensity. Modern life is fast—pick even one practice to start. Consult an Ayurvedic practitioner for personalized advice.",
  },

  // 19. Yoga and Breathing Basics
  {
    match: /yoga|breathing|pranayama|asana|meditation|stretching/i,
    answer:
      "Yoga combines postures (asanas), breathing (pranayama), and meditation. Simple poses like child's pose, downward dog, and seated forward bend improve flexibility and calm. Deep breathing (inhale for 4 counts, exhale for 4 counts) reduces stress. Start with 10–15 minutes daily. Do not strain or hold difficult poses; yoga is non-competitive. If you have back or joint problems, consult a teacher first. Online videos and classes are widely available.",
  },

  // 20. When Not to Rely on Home Remedies
  {
    match: /home remedy|when not|serious|professional|medical help|delay/i,
    answer:
      "Do not rely solely on home remedies for: fever above 103°F (39.4°C), severe pain, difficulty breathing, signs of stroke or heart problems, large bleeding, loss of consciousness, sudden severe symptoms, or anything that worsens despite care. Home remedies support wellbeing but cannot replace medical diagnosis and treatment. Delaying professional care can turn minor issues into emergencies. If unsure, consult a doctor. Your health is your priority.",
  },
];

/**
 * Emergency keywords that trigger urgent warning
 */
const EMERGENCY_KEYWORDS = [
  "chest pain",
  "heart attack",
  "breathing",
  "breathless",
  "shortness of breath",
  "severe bleed",
  "bleeding",
  "stroke",
  "paralysis",
  "fainting",
  "unconscious",
  "severe allergic",
  "anaphylaxis",
  "choking",
  "poisoning",
  "severe injury",
  "collapsed",
];

/**
 * Fallback response when no match is found
 */
const FALLBACK =
  "I can share general health information — symptoms and self-care basics, understanding reports, lifestyle habits, and when to see a doctor. Could you describe your concern in a little more detail? For example: 'I have a headache' or 'How do I improve my sleep?'";

/**
 * Clear disclaimer about the assistant
 */
export const ASSISTANT_DISCLAIMER =
  "AI responses are for informational purposes only and are not a substitute for professional medical advice. Always consult a qualified healthcare provider for diagnosis and treatment.";

/**
 * Check if question contains emergency keywords
 * @param question - User's question
 * @returns true if emergency keywords detected
 */
function containsEmergencyKeywords(question: string): boolean {
  return EMERGENCY_KEYWORDS.some((keyword) => new RegExp(keyword, "i").test(question));
}

/**
 * Get emergency warning banner if applicable
 * @param question - User's question
 * @returns Emergency warning message or empty string
 */
export function getEmergencyWarning(question: string): string {
  if (containsEmergencyKeywords(question)) {
    return "🚨 If you are experiencing chest pain, difficulty breathing, severe bleeding, signs of stroke (sudden weakness, speech problems, facial drooping), loss of consciousness, or severe allergic reactions, call emergency services or go to the nearest emergency room immediately. Do not wait.";
  }
  return "";
}

/**
 * Main function: ask the health assistant a question
 * @param question - User's health question
 * @returns Promise resolving to the assistant's response
 */
export async function askAssistant(question: string): Promise<string> {
  // Simulate async delay (optional, can be removed for instant responses)
  await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 500));

  // Find matching knowledge entry
  const hit = KNOWLEDGE.find((entry) => entry.match.test(question));

  // Return matched answer or fallback
  return hit ? hit.answer : FALLBACK;
}

/* ------------------------------------------------------------------ *
 * Real AI integration (server-backed) with a clearly separated
 * offline safety fallback. The API key stays on the server.
 *
 * This now drives a DYNAMIC, GUIDED CASE-TAKING INTERVIEW: after every
 * patient message the server decides the single most relevant next
 * question (based on what has already been said), tracks structured
 * case information, and flags emergencies instead of continuing normal
 * questioning. See routes/api/assistant.ts for the full contract.
 * ------------------------------------------------------------------ */

import type { Lang } from "@/lib/i18n/dictionary";
import { EMPTY_CASE_STATE, type CaseState, type CaseStatus } from "@/types";

export type AssistantTurn = { role: "user" | "assistant"; text: string };

export interface CaseTurnResult {
  /** Text to show to the patient in the chat bubble. */
  reply: string;
  /** ongoing = keep asking; emergency = stop and escalate; complete = intake finished. */
  status: CaseStatus;
  /** Updated structured case information after this turn. */
  caseState: CaseState;
  /** True when the AI service could not be reached and local guidance was used. */
  offline: boolean;
  /** Set when the failure should be surfaced as an error notice. */
  errorCode?: "rate_limit" | "credits" | "blocked" | "ai_error";
}

const OFFLINE_GUIDANCE: Record<Lang, string> = {
  en: "I could not reach the AI service just now, so I cannot continue the questions reliably. Please try again in a moment. If your symptoms are severe or getting worse, contact a doctor — and for emergency signs such as chest pain, breathing difficulty, severe bleeding or sudden weakness, call 112 or go to the nearest emergency department immediately.",
  hi: "मैं इस समय एआई सेवा से संपर्क नहीं कर सका, इसलिए सवाल आगे नहीं बढ़ा सकता। कृपया कुछ देर बाद फिर कोशिश करें। यदि तकलीफ़ ज़्यादा है या बढ़ रही है तो डॉक्टर से संपर्क करें — और सीने में दर्द, साँस लेने में कठिनाई, तेज़ रक्तस्राव या अचानक कमज़ोरी जैसे आपातकालीन लक्षणों में तुरंत 112 पर कॉल करें या नज़दीकी इमरजेंसी विभाग जाएँ।",
  hinglish:
    "Main is waqt AI service se connect nahi kar paaya, isliye sawaal aage nahi badha sakta. Thodi der baad phir try karein. Agar takleef zyada hai ya badh rahi hai to doctor se milna zaroori hai — aur chest pain, saans lene mein dikkat, tez bleeding ya sudden weakness jaise emergency signs mein turant 112 call karein ya nearest emergency department jaayein.",
};

/** Very small, offline-only safety net used only when the AI call itself fails. */
const OFFLINE_EMERGENCY_PATTERN =
  /chest pain|breathless|breathing|heart attack|stroke|unconscious|severe bleed|seizure|poisoning|साँस|सीने में दर्द|बेहोश|दौरा|khoon|saans|behosh/i;

/**
 * Sends the patient's latest message plus the running case state to the
 * server-side case-taking assistant, and returns the next question (or the
 * emergency/completion message) together with the updated case state.
 * Falls back to local safety guidance — never to an invented question or
 * diagnosis — when the AI service is unavailable.
 */
export async function sendCaseMessage(
  message: string,
  lang: Lang,
  history: AssistantTurn[],
  caseState: CaseState,
): Promise<CaseTurnResult> {
  try {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, lang, history, caseState }),
    });
    const data = (await response.json()) as {
      reply?: string;
      status?: CaseStatus;
      caseState?: CaseState;
      error?: string;
    };

    if (response.ok && data.reply && data.caseState) {
      return {
        reply: data.reply.trim(),
        status: data.status ?? "ongoing",
        caseState: data.caseState,
        offline: false,
      };
    }

    const code =
      data.error === "rate_limit" || data.error === "credits" || data.error === "blocked"
        ? data.error
        : "ai_error";
    return {
      reply: OFFLINE_GUIDANCE[lang],
      status: OFFLINE_EMERGENCY_PATTERN.test(message) ? "emergency" : "ongoing",
      caseState,
      offline: true,
      errorCode: code,
    };
  } catch {
    return {
      reply: OFFLINE_GUIDANCE[lang],
      status: OFFLINE_EMERGENCY_PATTERN.test(message) ? "emergency" : "ongoing",
      caseState,
      offline: true,
      errorCode: "ai_error",
    };
  }
}

export { EMPTY_CASE_STATE };
export type { CaseState, CaseStatus };
