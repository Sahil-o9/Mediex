import type { Lang } from "@/lib/i18n/dictionary";
import type { CaseState } from "@/types";

/* ------------------------------------------------------------------ *
 * Shared types for the AI-led consultation flow. Used by both the
 * browser and the server routes, so they contain no runtime code.
 *
 * PROVENANCE: every piece of case data is one of
 *   - "patient"  : typed/said by the patient in the conversation
 *   - "document" : extracted from an uploaded document (patient-reviewed)
 *   - "ai"       : written by the AI as a summary — never a diagnosis
 * The UI and the doctor dashboard label these separately.
 * ------------------------------------------------------------------ */

export type ConsultLang = Lang;

export type Sex = "male" | "female" | "other" | "prefer_not" | "";

export interface PatientDetails {
  /** Name or any identifier the patient is comfortable with. */
  name: string;
  patientId: string;
  age: number | null;
  sex: Sex;
  /** Optional. Only sent to the server if the patient consents to sharing. */
  contact: string;
}

/* ---------- documents ---------- */

export type DocumentType =
  | "blood_test"
  | "prescription"
  | "medical_record"
  | "imaging_report"
  | "other"
  | "unknown";

/**
 * How a value's presence in the source was checked.
 *  matched_in_text  – value literally found in the PDF's own text layer (strongest)
 *  read_from_image  – read from a photo by the AI; must be checked by the patient
 *  not_verified     – the AI reported it but it could not be found in the source text
 */
export type FindingVerification = "matched_in_text" | "read_from_image" | "not_verified";

/** Comparison against the reference range PRINTED ON THE REPORT (computed in code, not by the AI). */
export type FindingFlag = "below_range" | "above_range" | "within_range" | "not_comparable";

export interface DocumentFinding {
  id: string;
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: FindingFlag;
  verification: FindingVerification;
  /** True when the AI marked it uncertain OR it could not be verified. */
  uncertain: boolean;
}

export type ExtractionMethod = "pdf_text" | "image_vision";

export type DocumentNotice = "ai_not_configured" | "ai_failed" | "text_truncated" | "no_findings";

export interface DocumentAnalysis {
  documentType: DocumentType;
  method: ExtractionMethod;
  /** Text read from the document (PDF text layer or image transcription), for patient review. */
  extractedText: string;
  findings: DocumentFinding[];
  /** Plain-language AI summary in the consultation language. Empty when AI analysis is unavailable. */
  summary: string;
  highlights: string[];
  followUpQuestions: string[];
  /** Things the document did not state, or that could not be read reliably. */
  uncertainOrMissing: string[];
  /** False when only text extraction ran (AI not configured or failed). */
  aiAnalysed: boolean;
  notices: DocumentNotice[];
}

/** A document the patient reviewed and chose to include in the case. */
export interface IncludedDocument {
  id: string;
  fileName: string;
  mime: string;
  size: number;
  documentType: DocumentType;
  method: ExtractionMethod;
  extractedText: string;
  /** Only the findings the patient did not exclude. */
  findings: DocumentFinding[];
  summary: string;
  highlights: string[];
  uncertainOrMissing: string[];
  aiAnalysed: boolean;
  /** Patient consented to share the original file with the doctor. */
  shareOriginal: boolean;
}

/* ---------- conversation / session ---------- */

export interface ConsultMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  status?: "ongoing" | "emergency" | "complete";
  /** Marks a UI note (e.g. language changed) that should not be sent to the AI. */
  system?: boolean;
}

export type ConsultStep = "language" | "details" | "documents" | "conversation" | "summary";

export interface ConsultSession {
  version: 2;
  step: ConsultStep;
  language: ConsultLang;
  details: PatientDetails;
  documents: IncludedDocument[];
  messages: ConsultMessage[];
  caseState: CaseState;
  status: "ongoing" | "emergency" | "complete";
  /** Set once the case has been submitted to the doctor. */
  submittedCaseId: string | null;
  updatedAt: string;
}

/* ---------- case summary ---------- */

export interface CaseSummaryAi {
  text: string;
  /** False when the AI service was unavailable — the structured summary is still shown. */
  generated: boolean;
}

/* ---------- doctor side ---------- */

export type CaseReviewStatus = "new" | "in_review" | "reviewed" | "follow_up";

export const CASE_REVIEW_STATUSES: CaseReviewStatus[] = [
  "new",
  "in_review",
  "reviewed",
  "follow_up",
];

export interface ClinicalNote {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface StoredDocument extends Omit<IncludedDocument, "shareOriginal"> {
  /** True only if the patient consented AND the original file was stored. */
  hasOriginal: boolean;
}

export interface StoredCase {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: CaseReviewStatus;
  urgent: boolean;
  language: ConsultLang;
  patient: PatientDetails;
  caseState: CaseState;
  messages: Pick<ConsultMessage, "role" | "text" | "createdAt">[];
  documents: StoredDocument[];
  aiSummary: CaseSummaryAi;
  notes: ClinicalNote[];
}

export interface CaseListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: CaseReviewStatus;
  urgent: boolean;
  language: ConsultLang;
  patientName: string;
  patientId: string;
  age: number | null;
  sex: Sex;
  chiefComplaint: string;
  documentCount: number;
  noteCount: number;
}

/** Where cases are persisted; surfaced to the doctor so a temporary store is never mistaken for a real one. */
export type StorageMode = "memory" | "supabase";
