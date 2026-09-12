export interface Patient {
  patientId: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  email?: string | undefined;
  abhaId?: string | undefined;
  password: string;
  language: "hi" | "en" | "hinglish";
  consent: boolean;
  createdAt: string;
  bloodGroup?: string | undefined;
  emergencyContact?: string | undefined;
}

export interface Doctor {
  doctorId: string;
  password: string;
  name: string;
}

export interface AuthState {
  patient: Patient | null;
  doctor: Doctor | null;
}

export interface HospitalDoctor {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  slots: string[];
}

export interface Hospital {
  id: string;
  name: string;
  specialties: string[];
  address: string;
  city: string;
  distanceKm: number;
  status: "Open 24x7" | "Open now" | "Closing soon";
  rating: number;
  phone: string;
  doctors: HospitalDoctor[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  contact: string;
  hospitalName: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  reason?: string | undefined;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  /** Present on assistant messages that end the guided intake. */
  status?: CaseStatus;
}

/**
 * Structured information the guided case-taking assistant accumulates
 * across the conversation. Every field is optional/empty until the patient
 * mentions it — the assistant only asks about what is still missing.
 */
export interface CaseState {
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  severity: string;
  location: string;
  associatedSymptoms: string[];
  history: string;
  medicines: string;
  allergies: string;
  lifestyle: string;
  ayurvedic: string;
  redFlags: string[];
}

export const EMPTY_CASE_STATE: CaseState = {
  chiefComplaint: "",
  symptoms: [],
  duration: "",
  severity: "",
  location: "",
  associatedSymptoms: [],
  history: "",
  medicines: "",
  allergies: "",
  lifestyle: "",
  ayurvedic: "",
  redFlags: [],
};

export type CaseStatus = "ongoing" | "emergency" | "complete";

export interface ReportMetric {
  label: string;
  value: string;
  reference: string;
  status: "Normal" | "Attention" | "Consult Doctor";
  /** Localised display text for `status` (shown to the user). */
  statusLabel: string;
  note: string;
}

export interface ReportAnalysis {
  id: string;
  fileName: string;
  analyzedAt: string;
  metrics: ReportMetric[];
  observations: string[];
}
