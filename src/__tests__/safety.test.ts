import { describe, expect, it } from "vitest";
import { detectEmergency } from "@/lib/mediex/safety";

const yes = (s: string) => expect(detectEmergency(s).emergency, s).toBe(true);
const no = (s: string) => expect(detectEmergency(s).emergency, s).toBe(false);

describe("detectEmergency — positives", () => {
  it("English", () => {
    yes("I have severe chest pain since morning");
    yes("I can't breathe properly");
    yes("my father fainted and is not responding");
    yes("I am vomiting blood");
    yes("I want to kill myself");
    yes("she had a seizure just now");
    yes("there is sudden weakness in my left arm");
  });
  it("Hinglish", () => {
    yes("mujhe seene mein dard ho raha hai");
    yes("saans lene mein bahut takleef hai");
    yes("saans nahi le pa raha hoon");
    yes("wo behosh ho gaye");
    yes("khoon ki ulti hui");
    yes("maine zeher kha liya");
    yes("main marna chahta hoon");
  });
  it("Hindi (Devanagari)", () => {
    yes("मुझे सीने में तेज दर्द हो रहा है");
    yes("साँस लेने में बहुत तकलीफ है");
    yes("सांस नहीं ले पा रहा");
    yes("वो बेहोश हो गए");
    yes("खून की उल्टी हुई");
    yes("मैं आत्महत्या करना चाहता हूँ");
  });
});

describe("detectEmergency — negation (patient answering 'no' to a screening question)", () => {
  it("English", () => {
    no("no chest pain");
    no("I don't have any chest pain or breathlessness");
    no("no, not breathless, no fainting");
    no("without any bleeding problem");
  });
  it("Hinglish", () => {
    no("seene mein dard nahi hai");
    no("saans lene mein takleef nahi hai");
    no("nahi, behosh nahi hua");
    no("Nahi.");
  });
  it("Hindi", () => {
    no("सीने में दर्द नहीं है");
    no("साँस लेने में कोई तकलीफ नहीं");
    no("नहीं");
  });
  it("a negation in a DIFFERENT clause must not suppress a real emergency", () => {
    yes("seene mein dard hai, bukhar nahi hai");
    yes("I have chest pain but no fever");
    yes("सीने में दर्द है, उल्टी नहीं है");
  });
});

describe("detectEmergency — history vs ongoing", () => {
  it("does not stop the interview for a clearly past history item", () => {
    no("I had a heart attack 3 years ago");
    no("mujhe 2 saal pehle mirgi ka daura aaya tha");
  });
  it("still fires for suicidal ideation even if worded as past", () => {
    yes("I wanted to kill myself last year and feel it again");
  });
  it("ordinary complaints are not emergencies", () => {
    no("mujhe pet mein dard hai lagbhag 5 din se");
    no("I have a mild headache after meals");
    no("मुझे पेट में दर्द है");
    no("I stroked my cat");
  });
});
