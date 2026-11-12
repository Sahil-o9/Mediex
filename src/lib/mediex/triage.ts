import type { SpecialtyId } from "@/types/directory";
import { SPECIALTY_BY_ID } from "@/types/directory";
import { detectEmergency } from "./safety";

/**
 * Specialty-navigation triage.
 *
 * WHAT THIS IS: a rule-based mapper from the symptoms a patient describes to the
 * medical SPECIALTY they could consult. It runs identically in the browser and
 * on the server and needs no AI key, so the safety-critical path never depends
 * on an external service.
 *
 * WHAT THIS IS NOT: a diagnosis tool. It never names a disease, never suggests
 * a medicine, and never claims certainty. Output wording is always "may be
 * appropriate" and every result carries a disclaimer.
 *
 * Languages: English, Hinglish (Roman Hindi) and Hindi (Devanagari) symptom
 * words are all recognised regardless of the UI language. To add another
 * Indian language, (1) add symptom words to RULES, (2) add a strings entry in
 * TRIAGE_STRINGS. Nothing else changes.
 */

export type TriageLang = "en" | "hi" | "hinglish";

interface Rule {
  specialty: SpecialtyId;
  weight: number;
  /** English label of the symptom, shown back to the patient ("you mentioned: cough"). */
  label: string;
  re: RegExp;
}

const R = (specialty: SpecialtyId, weight: number, label: string, re: RegExp): Rule => ({
  specialty,
  weight,
  label,
  re,
});

const NEAR = "[^.,;।\\n]{0,14}";

const RULES: Rule[] = [
  /* ---------------- General medicine ---------------- */
  R(
    "general_medicine",
    0.9,
    "fever",
    /\b(?:fever|temperature|bukh?ar|bukhaar|tez bukhar)\b|बुखार|ज्वर/i,
  ),
  R(
    "general_medicine",
    0.7,
    "cold or flu-like symptoms",
    /\b(?:cold|flu|zukh?am|zukaam|runny nose|sneez\w*|chhink\w*)\b|जुकाम|सर्दी/i,
  ),
  R(
    "general_medicine",
    0.6,
    "body ache",
    /\b(?:body ?ache|body pain|badan (?:dard|toot\w*)|badan mein dard)\b|बदन दर्द|शरीर में दर्द/i,
  ),
  R(
    "general_medicine",
    0.7,
    "weakness or tiredness",
    /\b(?:weak(?:ness)?|fatigue|tired(?:ness)?|kamz[oa]ri|thakan|thaka hua)\b|कमज़ोरी|कमजोरी|थकान/i,
  ),
  R(
    "general_medicine",
    0.7,
    "loss of appetite",
    /\b(?:loss of appetite|no appetite|bh?ookh nahi|bhukh nahi|bhook kam)\b|भूख नहीं/i,
  ),
  R(
    "general_medicine",
    0.8,
    "viral or seasonal infection symptoms",
    /\b(?:viral|dengue|malaria|typhoid|chikungunya|infection)\b/i,
  ),
  R(
    "general_medicine",
    0.8,
    "general check-up",
    /\b(?:check ?-?up|health check|full body|routine test|general consult\w*)\b/i,
  ),
  R("general_medicine", 0.5, "cough", /\b(?:cough\w*|kh?aansi|khansi)\b|खांसी|खाँसी/i),
  R("general_medicine", 0.4, "sore throat", /\b(?:sore throat|throat pain)\b/i),

  /* ---------------- Cardiology ---------------- */
  R(
    "cardiology",
    1.0,
    "palpitations",
    /\b(?:palpitat\w*|heart (?:racing|pounding|fluttering|beating fast)|dh?adkan|dil (?:tez|zor se) dh?ad\w*)\b|धड़कन/i,
  ),
  R(
    "cardiology",
    0.9,
    "blood-pressure concern",
    /\b(?:high bp|low bp|bp high|bp low|blood pressure|hypertension|b\.?p\.? problem)\b|ब्लड प्रेशर/i,
  ),
  R("cardiology", 0.6, "cholesterol concern", /\bcholesterol\b|कोलेस्ट्रॉल/i),
  R(
    "cardiology",
    0.8,
    "swollen feet with tiredness",
    /\b(?:swollen (?:feet|ankles)|pair(?:on)? mein sujan)\b/i,
  ),

  /* ---------------- Pulmonology ---------------- */
  R(
    "pulmonology",
    0.9,
    "wheezing or asthma",
    /\b(?:wheez\w*|asthma|dama|sans? ki seeti)\b|दमा|अस्थमा/i,
  ),
  R(
    "pulmonology",
    1.0,
    "long-lasting cough",
    /\b(?:chronic cough|cough (?:for|since) (?:\d+|few|many|several) (?:weeks?|months?)|(?:hafte|mahine|mahino) se (?:khansi|khaansi)|khansi (?:\d+|kai) (?:hafte|mahine))\b/i,
  ),
  R(
    "pulmonology",
    0.6,
    "cough",
    /\b(?:cough\w*|kh?aansi|khansi|balgam|phlegm|sputum)\b|खांसी|खाँसी|बलगम/i,
  ),
  R(
    "pulmonology",
    0.8,
    "breathing discomfort",
    /\b(?:breathing (?:problem|difficulty|issue)|breathless on exertion|saans (?:ki|mein) (?:problem|dikkat))\b/i,
  ),

  /* ---------------- Gastroenterology ---------------- */
  R(
    "gastroenterology",
    1.0,
    "stomach pain",
    new RegExp(
      `\\b(?:stomach|abdom\\w*|belly|tummy)\\b${NEAR}\\b(?:pain|ache|cramp\\w*)\\b|\\bpet\\b${NEAR}\\b(?:dard|dukh\\w*|pain|marod)\\b|पेट${NEAR}दर्द|पेट दर्द`,
      "i",
    ),
  ),
  R(
    "gastroenterology",
    0.9,
    "acidity or heartburn",
    /\b(?:acidity|acid reflux|heartburn|gastric|gas problem|khatti dakar\w*|seene mein jalan)\b|एसिडिटी|गैस/i,
  ),
  R(
    "gastroenterology",
    0.7,
    "bloating or gas",
    /\b(?:bloat\w*|gas|apach|indigestion|ajeern)\b|अपच|अजीर्ण/i,
  ),
  R("gastroenterology", 0.9, "constipation", /\b(?:constipat\w*|kabz|kabj)\b|कब्ज़|कब्ज/i),
  R(
    "gastroenterology",
    0.9,
    "loose motions or diarrhoea",
    /\b(?:diarrh?o?ea|loose (?:motion|stool)s?|dast|patla potty)\b|दस्त/i,
  ),
  R(
    "gastroenterology",
    0.8,
    "vomiting or nausea",
    /\b(?:vomit\w*|nausea|nauseous|ulti|ji machal\w*|ghabrahat ho rahi)\b|उल्टी|जी मिचलाना/i,
  ),
  R(
    "gastroenterology",
    0.9,
    "yellow eyes or skin",
    /\b(?:jaundice|piliya|yellow (?:eyes|skin))\b|पीलिया/i,
  ),

  /* ---------------- Neurology ---------------- */
  R(
    "neurology",
    1.0,
    "headache",
    new RegExp(
      `\\b(?:headache|migraine|head pain)\\b|\\b(?:sir|sar|head)\\b${NEAR}\\b(?:dard|dukh\\w*|pain)\\b|सिर${NEAR}दर्द|माइग्रेन`,
      "i",
    ),
  ),
  R(
    "neurology",
    0.9,
    "dizziness",
    /\b(?:dizz\w*|giddiness|vertigo|chakkar|sar ghoom\w*|sir ghoom\w*)\b|चक्कर/i,
  ),
  R(
    "neurology",
    0.9,
    "numbness or tingling",
    /\b(?:numb\w*|tingling|pins and needles|jhunjhuni|sunn)\b|झुनझुनी|सुन्न/i,
  ),
  R("neurology", 0.8, "tremors", /\b(?:tremors?|shaking hands?|haath kaamp\w*|kampan)\b|कंपन/i),
  R(
    "neurology",
    0.8,
    "memory concerns",
    /\b(?:memory (?:loss|problem)|forget\w*|yaadasht|bhool\w*)\b|याददाश्त/i,
  ),

  /* ---------------- Orthopaedics ---------------- */
  R(
    "orthopaedics",
    1.0,
    "back pain",
    new RegExp(
      `\\b(?:back ?pain|lower back|kamar${NEAR}(?:dard|pain)|kamar dard)\\b|कमर${NEAR}दर्द`,
      "i",
    ),
  ),
  R(
    "orthopaedics",
    1.0,
    "joint pain",
    new RegExp(
      `\\b(?:joint pain|arthritis|jod(?:on|o)? (?:mein |me )?(?:dard|pain)|jodo ka dard)\\b|जोड़ों${NEAR}दर्द|जोड़ो${NEAR}दर्द`,
      "i",
    ),
  ),
  R(
    "orthopaedics",
    1.0,
    "knee pain",
    new RegExp(
      `\\b(?:knee|ghut?n(?:e|a|on))\\b${NEAR}\\b(?:pain|dard|swelling|sujan)\\b|घुटने${NEAR}दर्द`,
      "i",
    ),
  ),
  R(
    "orthopaedics",
    0.9,
    "shoulder or neck pain",
    new RegExp(
      `\\b(?:shoulder|neck|kandh(?:a|e)|gardan)\\b${NEAR}\\b(?:pain|dard|stiff\\w*|akad\\w*)\\b`,
      "i",
    ),
  ),
  R(
    "orthopaedics",
    1.0,
    "sprain or injury to bone or joint",
    /\b(?:fracture|sprain|twisted (?:my )?(?:ankle|knee|wrist)|dislocat\w*|haddi (?:toot\w*|mein)|bone pain|muscle (?:pain|cramp))\b|हड्डी/i,
  ),

  /* ---------------- Dermatology ---------------- */
  R(
    "dermatology",
    1.0,
    "skin rash",
    /\b(?:rash(?:es)?|skin (?:problem|allergy|infection|issue)|hives|eczema|psoriasis|ringworm|fungal|dad|daad)\b|चकत्ते|दाद/i,
  ),
  R("dermatology", 1.0, "itching", /\b(?:itch\w*|khuj(?:li|laahat)|khujaal)\b|खुजली/i),
  R(
    "dermatology",
    1.0,
    "acne or pimples",
    /\b(?:acne|pimples?|daane|danne|muhase|muhaase)\b|मुहांसे|दाने/i,
  ),
  R(
    "dermatology",
    1.0,
    "hair fall",
    /\b(?:hair (?:fall|loss)|baal (?:jhad|gir)\w*|dandruff|balding)\b|बाल झड़/i,
  ),
  R(
    "dermatology",
    0.9,
    "skin patches",
    /\b(?:white patch\w*|safed (?:daag|dhabbe)|dark patch\w*|pigmentation|vitiligo|skin (?:darkening|spots?))\b/i,
  ),

  /* ---------------- ENT ---------------- */
  R(
    "ent",
    1.0,
    "ear pain",
    new RegExp(
      `\\b(?:ear ?ache|ear pain|kaan${NEAR}(?:dard|pain|bah\\w*|band)|kaan dard)\\b|कान${NEAR}दर्द`,
      "i",
    ),
  ),
  R(
    "ent",
    0.9,
    "hearing difficulty",
    /\b(?:hearing (?:loss|problem|difficulty)|can'?t hear|ringing in (?:my )?ears?|tinnitus|kam sunai|sunai nahi)\b|कम सुनाई/i,
  ),
  R(
    "ent",
    1.0,
    "throat pain",
    new RegExp(
      `\\b(?:sore throat|throat (?:pain|infection)|tonsil\\w*|gal(?:a|e)${NEAR}(?:dard|kharab|pain|kharash)|gala kharab)\\b|गला${NEAR}(?:खराब|दर्द)`,
      "i",
    ),
  ),
  R(
    "ent",
    0.9,
    "blocked nose or sinus problem",
    /\b(?:blocked nose|stuffy nose|nose block\w*|sinus\w*|nak band|naak band|nasal)\b|साइनस|नाक बंद/i,
  ),
  R("ent", 0.9, "nosebleed", /\b(?:nose ?bleed\w*|nakseer|naak se khoon)\b/i),
  R("ent", 0.7, "voice change", /\b(?:hoarse\w*|voice (?:change|loss)|awaaz (?:baith|kharab))\b/i),

  /* ---------------- Ophthalmology ---------------- */
  R(
    "ophthalmology",
    1.0,
    "eye pain or redness",
    new RegExp(
      `\\b(?:eye (?:pain|ache|redness|infection)|red eyes?|pink eye|aankh${NEAR}(?:dard|pain|lal|laal)|ankh${NEAR}(?:dard|lal)|aankh lal)\\b|आँख${NEAR}(?:दर्द|लाल)|आंख${NEAR}(?:दर्द|लाल)`,
      "i",
    ),
  ),
  R(
    "ophthalmology",
    1.0,
    "blurred vision",
    /\b(?:blur(?:red|ry)? vision|vision (?:problem|blur\w*)|dhundh?la|dhundla dikh\w*|cannot see clearly|chashma|spectacles?|glasses?)\b|धुंधला/i,
  ),
  R(
    "ophthalmology",
    0.9,
    "watery or itchy eyes",
    /\b(?:watery eyes?|itchy eyes?|eye discharge|aankh se paani|aankhon mein khuj\w*)\b/i,
  ),

  /* ---------------- Gynaecology ---------------- */
  R(
    "gynaecology",
    1.0,
    "period-related concern",
    /\b(?:periods?|menstru\w*|mahwari|mahawari|maasik|masik dharm|irregular cycle|missed period|painful periods?)\b|पीरियड्स?|मासिक|माहवारी/i,
  ),
  R(
    "gynaecology",
    1.0,
    "pregnancy-related concern",
    /\b(?:pregnan\w*|garbh\w*|expecting|prenatal|antenatal|trimester|baby bump)\b|गर्भ|प्रेग्नेंट/i,
  ),
  R(
    "gynaecology",
    0.9,
    "vaginal discharge or itching",
    /\b(?:vaginal|white discharge|safed paani|leucorr?h?oea)\b/i,
  ),
  R("gynaecology", 0.9, "PCOS or hormonal period issues", /\b(?:pcos|pcod)\b/i),
  R("gynaecology", 0.8, "menopause", /\bmenopaus\w*\b/i),
  R("gynaecology", 0.9, "breast lump or pain", /\bbreast (?:lump|pain|swelling)\b/i),

  /* ---------------- Paediatrics ---------------- */
  R(
    "paediatrics",
    1.0,
    "child-specific concern",
    /\b(?:my (?:baby|infant|toddler|newborn)|newborn|infant|toddler|vaccination|vaccine schedule|immuni[sz]ation|growth (?:issue|concern)|(?:bachch|bacch|bach)(?:a|e|i|on))\b|बच्चा|बच्चे|बच्ची|शिशु/i,
  ),

  /* ---------------- Urology ---------------- */
  R(
    "urology",
    1.0,
    "burning urination",
    /\b(?:burning (?:while |during |on )?(?:urinat\w*|peeing)|painful urination|peshab (?:mein|me) (?:jalan|dard)|urine infection|uti)\b|पेशाब में जलन/i,
  ),
  R(
    "urology",
    0.9,
    "frequent urination",
    /\b(?:frequent urination|urinat\w* (?:very )?often|baar baar (?:peshab|toilet)|night urination)\b/i,
  ),
  R(
    "urology",
    1.0,
    "blood in urine",
    /\b(?:blood in (?:my )?urine|peshab (?:mein|me) khoon)\b|पेशाब में खून/i,
  ),
  R(
    "urology",
    1.0,
    "kidney stone concern",
    /\b(?:kidney stones?|pathri|stone in (?:the )?kidney)\b|पथरी/i,
  ),
  R(
    "urology",
    0.9,
    "prostate or urinary flow concern",
    /\b(?:prostate|weak urine (?:flow|stream)|peshab (?:ruk|dheere)\w*)\b/i,
  ),

  /* ---------------- Psychiatry ---------------- */
  R(
    "psychiatry",
    1.0,
    "anxiety or panic",
    /\b(?:anxiety|anxious|panic (?:attack|feeling)|ghabrahat|ghabrahat rehti|overthinking|too much worry)\b|घबराहट|चिंता/i,
  ),
  R(
    "psychiatry",
    1.0,
    "low mood",
    /\b(?:depress\w*|low mood|feeling (?:sad|low|hopeless)|udaas\w*|udas\w*|mann nahi lagta|man nahi lagta)\b|उदास/i,
  ),
  R(
    "psychiatry",
    0.9,
    "sleep difficulty",
    /\b(?:insomnia|can'?t sleep|trouble sleeping|sleep (?:problem|issue)s?|neend (?:nahi|nhi|kam|ki problem)|neend nahi aati)\b|नींद नहीं|नींद की/i,
  ),
  R("psychiatry", 0.7, "stress", /\b(?:stress(?:ed)?|tension|mental (?:health|pressure))\b|तनाव/i),

  /* ---------------- Endocrinology ---------------- */
  R(
    "endocrinology",
    1.0,
    "diabetes or blood-sugar concern",
    /\b(?:diabet\w*|blood sugar|sugar (?:level|problem|high|low|badh\w*)|madhumeh|high sugar)\b|मधुमेह|शुगर/i,
  ),
  R("endocrinology", 1.0, "thyroid concern", /\bthyroid\b|थायरॉइड|थायराइड/i),
  R(
    "endocrinology",
    0.8,
    "unexplained weight change",
    /\b(?:sudden weight (?:gain|loss)|unexplained weight|weight (?:gain|loss) (?:without|suddenly)|wajan (?:badh|ghat)\w* (?:achanak|bina))\b/i,
  ),
  R(
    "endocrinology",
    0.8,
    "excess thirst",
    /\b(?:excessive thirst|too much thirst|bahut pyaas|zyada pyaas)\b/i,
  ),

  /* ---------------- Dentistry ---------------- */
  R(
    "dentistry",
    1.0,
    "toothache",
    /\b(?:tooth ?ache|tooth pain|dental|cavity|cavities|wisdom tooth|da(?:a)?nt(?:\s+\w+){0,2}\s+(?:dard|pain|sad\w*|hil\w*)|dant dard|daant dard)\b|दांत|दाँत/i,
  ),
  R(
    "dentistry",
    1.0,
    "gum problem",
    /\b(?:gum (?:bleed\w*|pain|swelling|problem)|bleeding gums|masoode|masude|masudhe)\b|मसूड़/i,
  ),
  R("dentistry", 0.6, "mouth ulcers", /\b(?:mouth ulcers?|chhale|chale mooh)\b/i),
];

const AGE_RE =
  /(?:\b(?:age|aged)\s*(?:is\s*)?(\d{1,3})\b)|(?:\b(\d{1,3})\s*(?:years?|yrs?|y\/o|yo|saal|sal|varsh)\b(?:\s*old)?)|(?:(\d{1,3})\s*(?:वर्ष|साल))/i;
const MONTHS_RE = /\b(\d{1,2})\s*(?:months?|mahin(?:e|a|o)|mths?)\b(?:\s*old)?/i;

/** Returns an age in years if the patient stated one, otherwise null. */
export function detectAgeYears(text: string): number | null {
  const mm = MONTHS_RE.exec(text);
  if (mm) return Math.round((Number(mm[1]) / 12) * 10) / 10;
  const m = AGE_RE.exec(text);
  if (!m) return null;
  const n = Number(m[1] ?? m[2] ?? m[3]);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null;
}

const CHILD_WORD =
  /\b(?:child|children|kid|kids|baby|infant|toddler|newborn|son|daughter|(?:bachch|bacch|bach)(?:a|e|i|on)|beta|beti)\b|बच्चा|बच्चे|बच्ची|बेटा|बेटी/i;
const GENERIC_PAIN = /\b(?:pain|ache|aching|hurts?|dard|dukh(?:ta|rha|raha|ti)?)\b|दर्द/i;

export interface SpecialtySuggestion {
  id: SpecialtyId;
  /** 0..1 */
  weight: number;
  reasons: string[];
}

export type TriageStatus = "emergency" | "follow_up" | "ready";

export interface TriageResult {
  status: TriageStatus;
  /** Assistant message to show, already in the requested language. */
  reply: string;
  emergencyKind: "medical" | "mental_health" | null;
  followUpQuestion: string | null;
  quickReplies: string[];
  specialties: SpecialtySuggestion[];
  matchedSymptoms: string[];
  patientAgeYears: number | null;
  disclaimer: string;
  source: "rules";
}

interface TriageStrings {
  disclaimer: string;
  emergencyMedical: string;
  emergencyMental: string;
  askWhat: string;
  askWhere: string;
  askAge: string;
  askDetail: string;
  quickAgeChild: string;
  quickAgeAdult: string;
  quickDetail: string[];
  readyIntro: string;
  readyFallback: string;
  mayConsult: (names: string) => string;
  youMentioned: (list: string) => string;
  refine: string;
}

export const TRIAGE_STRINGS: Record<TriageLang, TriageStrings> = {
  en: {
    disclaimer:
      "MEDIEX suggests which type of specialist you could consult. It is not a diagnosis and not a replacement for a doctor.",
    emergencyMedical:
      "What you describe can be serious. Please do not wait for this chat: call 112 (national emergency) or 108 (ambulance), or go to the nearest hospital emergency department right now. If someone is with you, ask them to help you immediately.",
    emergencyMental:
      "I'm really sorry you are going through this, and I'm glad you said it. You deserve support right now. Please call Tele-MANAS on 14416 (free, 24×7) or 112, or go to the nearest hospital, and tell someone close to you where you are. If you are in immediate danger, call 112 now.",
    askWhat:
      "I want to point you to the right specialist. What is the main problem you are having, and where in the body do you feel it?",
    askWhere:
      "Where exactly do you feel the pain or discomfort (for example head, chest, stomach, back, joints, throat)?",
    askAge: "How old is the patient? Specialists differ for children and adults.",
    askDetail:
      "Thanks. To narrow this down: how long has this been going on, and is there anything else with it (like fever, vomiting, rash, weakness)?",
    quickAgeChild: "Under 14 years",
    quickAgeAdult: "Adult",
    quickDetail: ["Since today", "A few days", "More than 2 weeks", "No other symptoms"],
    readyIntro: "Thanks for explaining.",
    readyFallback:
      "I could not match your description to one specific specialty, so a General Physician is a good first step — they can examine you and refer you onward if needed.",
    mayConsult: (names) => `Based on what you described, you may want to consult: ${names}.`,
    youMentioned: (list) => `You mentioned: ${list}.`,
    refine:
      "If something is missing, tell me more and I will refine the suggestion. If your symptoms suddenly get worse, seek medical care immediately.",
  },
  hinglish: {
    disclaimer:
      "MEDIEX sirf yeh batata hai ki aap kis type ke specialist se mil sakte hain. Yeh diagnosis nahi hai aur doctor ka replacement nahi hai.",
    emergencyMedical:
      "Aapne jo bataya woh gambhir ho sakta hai. Kripya is chat ka intezaar na karein: abhi 112 (emergency) ya 108 (ambulance) par call karein, ya sabse nazdeeki hospital ke emergency mein jayein. Agar koi saath hai to unse turant madad lein.",
    emergencyMental:
      "Mujhe afsos hai ki aap yeh sab jhel rahe hain, aur aapne bataya yeh achha kiya. Aapko abhi support milna chahiye. Kripya Tele-MANAS 14416 (free, 24×7) ya 112 par call karein, ya nazdeeki hospital jayein aur kisi apne ko bata dein ki aap kahan hain. Agar abhi khatra hai to turant 112 par call karein.",
    askWhat:
      "Main aapko sahi specialist tak pahunchana chahta hoon. Aapko mukhya problem kya hai, aur body mein kahan mehsoos ho rahi hai?",
    askWhere: "Dard ya takleef bilkul kahan hai (jaise sir, seena, pet, kamar, jodon, gala)?",
    askAge: "Patient ki umar kitni hai? Bachchon aur badon ke specialist alag hote hain.",
    askDetail:
      "Shukriya. Thoda aur samajhne ke liye: yeh kab se ho raha hai, aur saath mein aur kuch hai (jaise bukhar, ulti, rash, kamzori)?",
    quickAgeChild: "14 saal se kam",
    quickAgeAdult: "Bada (adult)",
    quickDetail: ["Aaj se", "Kuch dinon se", "2 hafte se zyada", "Aur koi problem nahi"],
    readyIntro: "Batane ke liye shukriya.",
    readyFallback:
      "Main aapki baat ko kisi ek specialty se match nahi kar paaya, isliye General Physician se milna achha pehla kadam hai — woh jaanch karke zarurat ho to aage refer kar denge.",
    mayConsult: (names) => `Aapne jo bataya uske hisaab se aap in se mil sakte hain: ${names}.`,
    youMentioned: (list) => `Aapne bataya: ${list}.`,
    refine:
      "Kuch chhoot gaya ho to aur bataiye, main suggestion behtar kar dunga. Agar lakshan achanak badh jayein to turant medical help lein.",
  },
  hi: {
    disclaimer:
      "MEDIEX केवल यह बताता है कि आप किस प्रकार के विशेषज्ञ से मिल सकते हैं। यह निदान नहीं है और डॉक्टर का विकल्प नहीं है।",
    emergencyMedical:
      "आपने जो बताया वह गंभीर हो सकता है। कृपया इस चैट का इंतज़ार न करें: अभी 112 (आपातकाल) या 108 (एम्बुलेंस) पर कॉल करें, या सबसे नज़दीकी अस्पताल के इमरजेंसी में जाएँ। यदि कोई साथ है तो तुरंत उनसे मदद लें।",
    emergencyMental:
      "मुझे दुख है कि आप यह सब झेल रहे हैं, और आपने बताया यह अच्छा किया। आपको अभी सहारा मिलना चाहिए। कृपया Tele-MANAS 14416 (निःशुल्क, 24×7) या 112 पर कॉल करें, या नज़दीकी अस्पताल जाएँ और किसी अपने को बता दें कि आप कहाँ हैं। अगर अभी खतरा है तो तुरंत 112 पर कॉल करें।",
    askWhat:
      "मैं आपको सही विशेषज्ञ तक पहुँचाना चाहता हूँ। आपकी मुख्य समस्या क्या है, और शरीर में कहाँ महसूस हो रही है?",
    askWhere: "दर्द या तकलीफ़ ठीक कहाँ है (जैसे सिर, सीना, पेट, कमर, जोड़, गला)?",
    askAge: "मरीज़ की उम्र कितनी है? बच्चों और बड़ों के विशेषज्ञ अलग होते हैं।",
    askDetail:
      "धन्यवाद। थोड़ा और समझने के लिए: यह कब से है, और साथ में और कुछ है (जैसे बुखार, उल्टी, रैश, कमज़ोरी)?",
    quickAgeChild: "14 साल से कम",
    quickAgeAdult: "वयस्क",
    quickDetail: ["आज से", "कुछ दिनों से", "2 हफ़्ते से ज़्यादा", "और कोई समस्या नहीं"],
    readyIntro: "बताने के लिए धन्यवाद।",
    readyFallback:
      "मैं आपकी बात को किसी एक विशेषता से नहीं जोड़ पाया, इसलिए जनरल फिज़िशियन से मिलना अच्छा पहला कदम है — वे जाँच करके ज़रूरत हो तो आगे रेफ़र कर देंगे।",
    mayConsult: (names) => `आपने जो बताया उसके आधार पर आप इनसे मिल सकते हैं: ${names}।`,
    youMentioned: (list) => `आपने बताया: ${list}।`,
    refine:
      "कुछ छूट गया हो तो और बताइए, मैं सुझाव बेहतर कर दूँगा। अगर लक्षण अचानक बढ़ें तो तुरंत चिकित्सा सहायता लें।",
  },
};

const SPECIALTY_NAME_HI: Partial<Record<SpecialtyId, string>> = {
  general_medicine: "जनरल फिज़िशियन",
  cardiology: "हृदय रोग विशेषज्ञ (कार्डियोलॉजिस्ट)",
  pulmonology: "फेफड़ा रोग विशेषज्ञ",
  gastroenterology: "पेट रोग विशेषज्ञ",
  neurology: "न्यूरोलॉजिस्ट",
  orthopaedics: "हड्डी रोग विशेषज्ञ",
  dermatology: "त्वचा रोग विशेषज्ञ",
  ent: "ईएनटी विशेषज्ञ",
  ophthalmology: "नेत्र रोग विशेषज्ञ",
  gynaecology: "स्त्री रोग विशेषज्ञ",
  paediatrics: "बाल रोग विशेषज्ञ",
  urology: "मूत्र रोग विशेषज्ञ",
  psychiatry: "मनोचिकित्सक",
  endocrinology: "एंडोक्राइनोलॉजिस्ट",
  dentistry: "दंत चिकित्सक",
};

export function specialtyDisplayName(id: SpecialtyId, lang: TriageLang): string {
  if (lang === "hi") return SPECIALTY_NAME_HI[id] ?? SPECIALTY_BY_ID[id].name;
  return SPECIALTY_BY_ID[id].name;
}

const SELF_HARM_RE =
  /\b(?:suicid(?:e|al)|kill myself|end my life|want to die|self[- ]harm|khudkushi|aatmahatya|marna chahta|marna chahti|mar jana chahta|jaan dena chahta|jaan dena chahti)\b|आत्महत्या|खुदकुशी|मरना\s*चाह|जान\s*देना\s*चाह/i;

export const MAX_FOLLOW_UPS = 2;

interface Scored {
  scores: Map<SpecialtyId, { total: number; reasons: Set<string> }>;
  labels: Set<string>;
}

function scoreText(text: string): Scored {
  const scores: Scored["scores"] = new Map();
  const labels = new Set<string>();
  const seen = new Set<Rule>();
  for (const rule of RULES) {
    if (seen.has(rule) || !rule.re.test(text)) continue;
    seen.add(rule);
    const entry = scores.get(rule.specialty) ?? { total: 0, reasons: new Set<string>() };
    entry.total += rule.weight;
    entry.reasons.add(rule.label);
    scores.set(rule.specialty, entry);
    labels.add(rule.label);
  }
  return { scores, labels };
}

function buildSuggestions(
  scored: Scored,
  ageYears: number | null,
  childCue: boolean,
): { list: SpecialtySuggestion[]; topConfidence: number } {
  const entries = [...scored.scores.entries()].sort((a, b) => b[1].total - a[1].total);
  if (entries.length === 0) return { list: [], topConfidence: 0 };
  const topScore = entries[0]![1].total;
  const topConfidence = Math.min(1, 0.6 + 0.4 * Math.min(1, topScore / 1.5));
  const list: SpecialtySuggestion[] = [];
  for (const [id, v] of entries) {
    const w = Math.min(1, (v.total / topScore) * topConfidence);
    if (list.length > 0 && w < topConfidence * 0.4) continue;
    list.push({ id, weight: Math.round(w * 100) / 100, reasons: [...v.reasons] });
    if (list.length >= 3) break;
  }
  const isChild = (ageYears !== null && ageYears < 14) || (ageYears === null && childCue);
  if (isChild && !list.some((s) => s.id === "paediatrics")) {
    list.unshift({
      id: "paediatrics",
      weight: Math.round(Math.max(topConfidence, 0.85) * 100) / 100,
      reasons: ["patient appears to be a child"],
    });
    list.splice(3);
  } else if (isChild) {
    // Make paediatrics the first stop for a child.
    list.sort((a, b) => (a.id === "paediatrics" ? -1 : b.id === "paediatrics" ? 1 : 0));
  }
  return { list, topConfidence };
}

/**
 * @param userMessages every message the patient has sent in this conversation, oldest first.
 *   The conversation is re-evaluated from scratch each time, so the function is pure and
 *   stateless — a follow-up answer such as "6 years old" simply becomes another message.
 */
export function triage(userMessages: string[], lang: TriageLang = "en"): TriageResult {
  const S = TRIAGE_STRINGS[lang] ?? TRIAGE_STRINGS.en;
  const messages = userMessages.map((m) => m.trim()).filter(Boolean);
  const base = {
    emergencyKind: null,
    followUpQuestion: null,
    quickReplies: [] as string[],
    specialties: [] as SpecialtySuggestion[],
    matchedSymptoms: [] as string[],
    patientAgeYears: null as number | null,
    disclaimer: S.disclaimer,
    source: "rules" as const,
  };

  /* 1. Emergency screening always wins and ends the questioning. */
  for (const m of messages) {
    const em = detectEmergency(m);
    if (em.emergency) {
      const mental = SELF_HARM_RE.test(m);
      return {
        ...base,
        status: "emergency",
        emergencyKind: mental ? "mental_health" : "medical",
        reply: mental ? S.emergencyMental : S.emergencyMedical,
      };
    }
  }

  const combined = messages.join(". ");
  const ageYears = detectAgeYears(combined);
  const childCue = CHILD_WORD.test(combined);
  const scored = scoreText(combined);
  const { list, topConfidence } = buildSuggestions(scored, ageYears, childCue);
  const followUpsAsked = Math.max(0, messages.length - 1);
  const canAsk = followUpsAsked < MAX_FOLLOW_UPS;
  const matchedSymptoms = [...scored.labels];

  /* 2. Follow-up only when it is genuinely needed. */
  if (messages.length === 0) {
    return { ...base, status: "follow_up", reply: S.askWhat, followUpQuestion: S.askWhat };
  }
  if (canAsk) {
    if (list.length === 0) {
      const q = GENERIC_PAIN.test(combined) ? S.askWhere : S.askWhat;
      return {
        ...base,
        status: "follow_up",
        reply: q,
        followUpQuestion: q,
        patientAgeYears: ageYears,
      };
    }
    if (ageYears === null && childCue && followUpsAsked === 0) {
      return {
        ...base,
        status: "follow_up",
        reply: S.askAge,
        followUpQuestion: S.askAge,
        quickReplies: [S.quickAgeChild, S.quickAgeAdult],
        specialties: list,
        matchedSymptoms,
      };
    }
    const second = list[1];
    const tie = !!second && list[0]!.weight - second.weight < 0.15;
    if (followUpsAsked === 0 && (topConfidence < 0.75 || tie)) {
      return {
        ...base,
        status: "follow_up",
        reply: S.askDetail,
        followUpQuestion: S.askDetail,
        quickReplies: S.quickDetail,
        specialties: list,
        matchedSymptoms,
        patientAgeYears: ageYears,
      };
    }
  }

  /* 3. Ready: specialties + doctors. */
  let suggestions = list;
  let intro = S.readyIntro;
  if (suggestions.length === 0) {
    suggestions = [
      { id: "general_medicine", weight: 0.6, reasons: ["no specific symptom matched"] },
    ];
    intro = `${S.readyIntro} ${S.readyFallback}`;
  } else {
    const names = suggestions.map((s) => specialtyDisplayName(s.id, lang)).join(", ");
    const parts = [S.readyIntro];
    if (matchedSymptoms.length) parts.push(S.youMentioned(matchedSymptoms.join(", ")));
    parts.push(S.mayConsult(names));
    intro = parts.join(" ");
  }
  return {
    ...base,
    status: "ready",
    reply: `${intro} ${S.refine}`,
    specialties: suggestions,
    matchedSymptoms,
    patientAgeYears: ageYears,
  };
}
