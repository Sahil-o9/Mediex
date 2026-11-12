import { describe, expect, it } from "vitest";
import { MAX_FOLLOW_UPS, TRIAGE_STRINGS, detectAgeYears, triage } from "@/lib/mediex/triage";

describe("triage: emergencies", () => {
  it.each([
    "I have chest pain and I am sweating",
    "mujhe seene mein dard ho raha hai",
    "saans nahi le pa raha",
    "he is unconscious",
    "सीने में दर्द है",
    "worst headache of my life",
    "my father was bitten by a snake",
    "bleeding during pregnancy",
  ])("escalates %s", (text) => {
    const r = triage([text], "en");
    expect(r.status).toBe("emergency");
    expect(r.reply).toMatch(/112|108/);
    expect(r.followUpQuestion).toBeNull();
    expect(r.specialties).toEqual([]);
  });

  it("escalates even when the red flag appears in a later answer, and stops questioning", () => {
    const r = triage(["I have a headache", "since morning and now I cannot breathe"], "en");
    expect(r.status).toBe("emergency");
  });

  it("does not escalate on negation", () => {
    const r = triage(["I have a headache, no chest pain"], "en");
    expect(r.status).not.toBe("emergency");
  });

  it("routes suicidal statements to a mental-health helpline, not an ambulance-only message", () => {
    const r = triage(["I want to die"], "en");
    expect(r.status).toBe("emergency");
    expect(r.emergencyKind).toBe("mental_health");
    expect(r.reply).toContain("14416");
  });

  it("responds in the selected language for emergencies", () => {
    expect(triage(["seene mein dard"], "hinglish").reply).toBe(
      TRIAGE_STRINGS.hinglish.emergencyMedical,
    );
    expect(triage(["सीने में दर्द"], "hi").reply).toBe(TRIAGE_STRINGS.hi.emergencyMedical);
  });
});

describe("triage: specialty suggestions", () => {
  const top = (msgs: string[], lang: "en" | "hi" | "hinglish" = "en") =>
    triage(msgs, lang).specialties[0]?.id;

  it("maps English symptoms", () => {
    expect(top(["I have a skin rash and itching on my arms"])).toBe("dermatology");
    expect(top(["severe headache and dizziness for 3 days"])).toBe("neurology");
    expect(top(["lower back pain for two weeks"])).toBe("orthopaedics");
    expect(top(["burning while urinating since yesterday"])).toBe("urology");
    expect(top(["I feel very anxious and cannot sleep"])).toBe("psychiatry");
    expect(top(["my periods are irregular"])).toBe("gynaecology");
    expect(top(["blurred vision in my left eye"])).toBe("ophthalmology");
    expect(top(["sore throat and ear pain"])).toBe("ent");
    expect(top(["toothache and bleeding gums"])).toBe("dentistry");
    expect(top(["my sugar level is high and I have thyroid"])).toBe("endocrinology");
    expect(top(["palpitations and high bp"])).toBe("cardiology");
  });

  it("maps Hinglish symptoms", () => {
    expect(top(["pet mein dard aur ulti ho rahi hai"], "hinglish")).toBe("gastroenterology");
    expect(top(["kamar dard bahut hai"], "hinglish")).toBe("orthopaedics");
    expect(top(["sir dard aur chakkar"], "hinglish")).toBe("neurology");
    expect(top(["daant dard hai"], "hinglish")).toBe("dentistry");
    expect(top(["khujli aur daane ho gaye hain"], "hinglish")).toBe("dermatology");
    expect(top(["peshab mein jalan hai"], "hinglish")).toBe("urology");
    expect(top(["neend nahi aati aur ghabrahat rehti hai"], "hinglish")).toBe("psychiatry");
  });

  it("maps Hindi (Devanagari) symptoms", () => {
    expect(top(["मुझे सिर दर्द है"], "hi")).toBe("neurology");
    expect(top(["पेट दर्द और उल्टी"], "hi")).toBe("gastroenterology");
    expect(top(["घुटने में दर्द है"], "hi")).toBe("orthopaedics");
  });

  it("never names a disease or claims certainty in its reply", () => {
    const r = triage(["fever and body ache since 2 days"], "en");
    const text = r.reply.toLowerCase();
    expect(r.status).toBe("ready");
    expect(text).toMatch(/may want to consult|may/);
    for (const banned of [
      "you have",
      "diagnosed",
      "prescri",
      "take tablet",
      "paracetamol",
      "you are suffering",
    ]) {
      expect(text).not.toContain(banned);
    }
    expect(r.disclaimer.toLowerCase()).toContain("not a diagnosis");
  });
});

describe("triage: follow-ups", () => {
  it("asks what the problem is when nothing is understood", () => {
    const r = triage(["hello"], "en");
    expect(r.status).toBe("follow_up");
    expect(r.followUpQuestion).toBe(TRIAGE_STRINGS.en.askWhat);
  });

  it("asks where it hurts for a bare 'pain'", () => {
    const r = triage(["I have pain"], "en");
    expect(r.followUpQuestion).toBe(TRIAGE_STRINGS.en.askWhere);
  });

  it("asks the patient's age when a child is mentioned without an age, with quick replies", () => {
    const r = triage(["mere bachche ko bukhar hai"], "hinglish");
    expect(r.status).toBe("follow_up");
    expect(r.followUpQuestion).toBe(TRIAGE_STRINGS.hinglish.askAge);
    expect(r.quickReplies.length).toBe(2);
  });

  it("puts paediatrics first once the child's age is known", () => {
    const r = triage(["my son has fever", "he is 6 years old"], "en");
    expect(r.status).toBe("ready");
    expect(r.specialties[0]?.id).toBe("paediatrics");
    expect(r.patientAgeYears).toBe(6);
  });

  it("does not ask follow-ups once the limit is reached and falls back to a General Physician", () => {
    const r = triage(["hello", "not sure", "just feeling off"], "en");
    expect(MAX_FOLLOW_UPS).toBe(2);
    expect(r.status).toBe("ready");
    expect(r.specialties[0]?.id).toBe("general_medicine");
    expect(r.reply).toContain("General Physician");
  });

  it("goes straight to results when symptoms are clear", () => {
    const r = triage(["skin rash and itching for a week"], "en");
    expect(r.status).toBe("ready");
  });
});

describe("detectAgeYears", () => {
  it("parses several phrasings", () => {
    expect(detectAgeYears("she is 45 years old")).toBe(45);
    expect(detectAgeYears("meri umar 32 saal hai")).toBe(32);
    expect(detectAgeYears("age 7")).toBe(7);
    expect(detectAgeYears("baby is 8 months old")).toBeCloseTo(0.7, 1);
    expect(detectAgeYears("no age given")).toBeNull();
  });
});
