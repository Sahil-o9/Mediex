import { describe, expect, it } from "vitest";
import { checkReplyLanguage } from "@/lib/mediex/language";

describe("checkReplyLanguage", () => {
  it("accepts Devanagari for hi, including English terms in brackets", () => {
    expect(checkReplyLanguage("आपको पेट में दर्द कब से हो रहा है?", "hi").ok).toBe(true);
    expect(checkReplyLanguage("क्या आपको बुखार (fever) भी है?", "hi").ok).toBe(true);
  });
  it("rejects English or Hinglish when hi is selected", () => {
    expect(checkReplyLanguage("How long have you had the pain?", "hi").ok).toBe(false);
    expect(checkReplyLanguage("Aapko dard kab se ho raha hai?", "hi").ok).toBe(false);
  });
  it("accepts Roman-script Hindi for hinglish and rejects Devanagari / plain English", () => {
    expect(checkReplyLanguage("Aapko pet mein dard kab se ho raha hai?", "hinglish").ok).toBe(true);
    expect(checkReplyLanguage("आपको पेट में दर्द कब से है?", "hinglish").ok).toBe(false);
    expect(checkReplyLanguage("How long have you had this stomach pain exactly?", "hinglish").ok).toBe(false);
  });
  it("accepts English for en and rejects Devanagari or romanised Hindi", () => {
    expect(checkReplyLanguage("How long have you had the stomach pain?", "en").ok).toBe(true);
    expect(checkReplyLanguage("आपको दर्द कब से है?", "en").ok).toBe(false);
    expect(checkReplyLanguage("Aapko dard kab se hai, kya bukhar bhi hai?", "en").ok).toBe(false);
  });
  it("rejects empty replies", () => {
    expect(checkReplyLanguage("   ", "en").ok).toBe(false);
  });
});
