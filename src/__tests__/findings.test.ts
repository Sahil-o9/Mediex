import { describe, expect, it } from "vitest";
import { appearsInText, computeFlag, parseNumber, parseRange, verificationFor } from "@/lib/mediex/findings";
import { asCaseState, computeProgress, mergeCaseState } from "@/lib/mediex/caseState";
import { EMPTY_CASE_STATE } from "@/types";

describe("parseRange / computeFlag (only against the range printed on the report)", () => {
  it("parses common printed formats", () => {
    expect(parseRange("12.0 - 15.5 g/dL")).toEqual({ low: 12, high: 15.5 });
    expect(parseRange("70–99 mg/dL")).toEqual({ low: 70, high: 99 });
    expect(parseRange("70 to 99")).toEqual({ low: 70, high: 99 });
    expect(parseRange("< 200 mg/dL")).toEqual({ high: 200 });
    expect(parseRange("> 40")).toEqual({ low: 40 });
    expect(parseRange("1,000 - 4,500")).toEqual({ low: 1000, high: 4500 });
  });
  it("refuses to guess unparseable ranges", () => {
    expect(parseRange("see note")).toBeNull();
    expect(parseRange("")).toBeNull();
    expect(parseRange("15 - 12")).toBeNull();
  });
  it("flags below / above / within", () => {
    expect(computeFlag("11.4", "12.0 - 15.5")).toBe("below_range");
    expect(computeFlag("104", "70 - 99")).toBe("above_range");
    expect(computeFlag("182", "< 200")).toBe("within_range");
    expect(computeFlag("13", "12 - 15.5")).toBe("within_range");
  });
  it("returns not_comparable instead of inventing a flag", () => {
    expect(computeFlag("Positive", "Negative")).toBe("not_comparable");
    expect(computeFlag("<0.5", "0 - 1")).toBe("not_comparable");
    expect(computeFlag("11.4", "")).toBe("not_comparable");
    expect(parseNumber("11.4 g/dL")).toBeNull();
  });
});

describe("verification against the source text", () => {
  const text = "Hemoglobin   11.4  g/dL   12.0 - 15.5\nTotal Cholesterol 182 mg/dL";
  it("matches values that are literally present", () => {
    expect(appearsInText("Hemoglobin", "11.4", text)).toBe(true);
    expect(appearsInText("Total Cholesterol", "182", text)).toBe(true);
  });
  it("rejects values the model invented", () => {
    expect(appearsInText("Hemoglobin", "9.8", text)).toBe(false);
    expect(appearsInText("Vitamin D", "26", text)).toBe(false);
  });
  it("does not accept a value that only matches under the wrong test name", () => {
    expect(appearsInText("Glucose", "182", text)).toBe(false);
  });
  it("marks image findings as read_from_image (never as verified text)", () => {
    expect(verificationFor("image_vision", "Hemoglobin", "11.4", "")).toBe("read_from_image");
    expect(verificationFor("pdf_text", "Hemoglobin", "11.4", text)).toBe("matched_in_text");
    expect(verificationFor("pdf_text", "Hemoglobin", "9.9", text)).toBe("not_verified");
  });
});

describe("case state helpers", () => {
  it("bounds and coerces untrusted input", () => {
    const s = asCaseState({ chiefComplaint: "x".repeat(5000), symptoms: ["a", 3, null, "b"], duration: 7 });
    expect(s.chiefComplaint.length).toBe(600);
    expect(s.symptoms).toEqual(["a", "b"]);
    expect(s.duration).toBe("");
    expect(asCaseState("garbage")).toEqual(EMPTY_CASE_STATE);
  });
  it("never lets an empty model value erase a known fact", () => {
    const prev = { ...EMPTY_CASE_STATE, chiefComplaint: "stomach pain", symptoms: ["pain"], duration: "5 days" };
    const next = { ...EMPTY_CASE_STATE, symptoms: ["Nausea", "pain"], severity: "moderate" };
    const merged = mergeCaseState(prev, next);
    expect(merged.chiefComplaint).toBe("stomach pain");
    expect(merged.duration).toBe("5 days");
    expect(merged.severity).toBe("moderate");
    expect(merged.symptoms).toEqual(["pain", "Nausea"]);
  });
  it("progress counts skipped topics as covered so it can reach 100%", () => {
    expect(computeProgress(EMPTY_CASE_STATE).percent).toBe(0);
    const partial = { ...EMPTY_CASE_STATE, chiefComplaint: "a", duration: "b" };
    expect(computeProgress(partial).done).toBe(2);
    const skipped = { ...partial, unanswered: ["allergies", "lifestyle"] };
    expect(computeProgress(skipped).done).toBe(4);
    const all = {
      ...EMPTY_CASE_STATE, chiefComplaint: "a", duration: "b", severity: "c", associatedSymptoms: ["d"],
      history: "e", medicines: "f", allergies: "g", lifestyle: "h", unanswered: ["x", "y"],
    };
    expect(computeProgress(all).percent).toBe(100);
  });
});
