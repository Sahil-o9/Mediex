/**
 * Shared (browser + server) types for the specialist-discovery platform.
 * No runtime code except constants, so this file is safe to import anywhere.
 */

export type SpecialtyId =
  | "general_medicine"
  | "cardiology"
  | "pulmonology"
  | "gastroenterology"
  | "neurology"
  | "orthopaedics"
  | "dermatology"
  | "ent"
  | "ophthalmology"
  | "gynaecology"
  | "paediatrics"
  | "urology"
  | "psychiatry"
  | "endocrinology"
  | "dentistry";

export interface SpecialtyInfo {
  id: SpecialtyId;
  name: string;
  /** Plain-language scope, shown to the patient next to a suggestion. */
  scope: string;
}

export const SPECIALTIES: SpecialtyInfo[] = [
  {
    id: "general_medicine",
    name: "General Physician",
    scope: "First point of contact for fever, infections and general complaints",
  },
  { id: "cardiology", name: "Cardiologist", scope: "Heart and blood-pressure related concerns" },
  { id: "pulmonology", name: "Pulmonologist", scope: "Lung, breathing and chronic cough concerns" },
  {
    id: "gastroenterology",
    name: "Gastroenterologist",
    scope: "Stomach, digestion and liver related concerns",
  },
  { id: "neurology", name: "Neurologist", scope: "Brain, nerve, headache and dizziness concerns" },
  {
    id: "orthopaedics",
    name: "Orthopaedic Specialist",
    scope: "Bone, joint, muscle and back concerns",
  },
  { id: "dermatology", name: "Dermatologist", scope: "Skin, hair and nail concerns" },
  { id: "ent", name: "ENT Specialist", scope: "Ear, nose and throat concerns" },
  { id: "ophthalmology", name: "Eye Specialist", scope: "Eye and vision concerns" },
  {
    id: "gynaecology",
    name: "Gynaecologist",
    scope: "Women's health, periods and pregnancy related concerns",
  },
  { id: "paediatrics", name: "Paediatrician", scope: "Health concerns of infants and children" },
  { id: "urology", name: "Urologist", scope: "Urinary tract and male reproductive concerns" },
  {
    id: "psychiatry",
    name: "Psychiatrist",
    scope: "Mood, anxiety, sleep and mental-health concerns",
  },
  {
    id: "endocrinology",
    name: "Endocrinologist",
    scope: "Diabetes, thyroid and hormone related concerns",
  },
  { id: "dentistry", name: "Dentist", scope: "Teeth, gums and mouth concerns" },
];

export const SPECIALTY_BY_ID: Record<SpecialtyId, SpecialtyInfo> = Object.fromEntries(
  SPECIALTIES.map((s) => [s.id, s]),
) as Record<SpecialtyId, SpecialtyInfo>;

export function isSpecialtyId(v: unknown): v is SpecialtyId {
  return typeof v === "string" && v in SPECIALTY_BY_ID;
}

/**
 * unverified – registered, nothing checked (default for every new doctor and every demo profile)
 * pending    – doctor submitted registration details; waiting for an admin check
 * verified   – an admin manually checked the registration number against the official register
 * rejected   – admin could not confirm the registration
 * MEDIEX never auto-marks anyone "verified"; there is no public NMC API to call.
 */
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface Clinic {
  id: string;
  name: string;
  kind: "hospital" | "clinic";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  isDemo: boolean;
  verificationStatus: "pending" | "verified" | "rejected";
}

export interface HospitalDirectoryEntry {
  id: string;
  name: string;
  kind: "hospital" | "clinic";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  specialties: SpecialtyId[];
  doctors: {
    id: string;
    fullName: string;
    specialties: SpecialtyId[];
    qualifications: string;
    experienceYears: number | null;
    consultationFee: number | null;
    verificationStatus: VerificationStatus;
  }[];
}

export interface AvailabilityWindow {
  id: string;
  /** 0 = Sunday … 6 = Saturday (same as JS getDay()). */
  weekday: number;
  /** "HH:MM" 24h, clinic-local time (IST). */
  startTime: string;
  endTime: string;
}

export interface Leave {
  id: string;
  /** "YYYY-MM-DD", inclusive. */
  startDate: string;
  endDate: string;
  reason: string;
}

export interface DoctorProfile {
  id: string;
  fullName: string;
  qualifications: string;
  specialties: SpecialtyId[];
  primarySpecialty: SpecialtyId;
  conditions: string[];
  experienceYears: number | null;
  languages: string[];
  consultationFee: number | null;
  bio: string;
  slotMinutes: number;
  acceptingAppointments: boolean;
  verificationStatus: VerificationStatus;
  verificationSource: "admin_register_check" | null;
  isDemo: boolean;
  clinic: Clinic | null;
  availability: AvailabilityWindow[];
  leaves: Leave[];
}

/** Fields only the doctor themself (or an admin) may see. */
export interface DoctorPrivateFields {
  registrationNumber: string;
  registrationCouncil: string;
  phone: string;
}

export interface Slot {
  date: string;
  time: string;
}

export type AvailabilityState =
  "available_today" | "available_soon" | "available_later" | "on_leave" | "no_availability";

export interface DoctorMatch {
  doctor: DoctorProfile;
  /** Kilometres, or null when the patient or doctor coordinates are unknown. */
  distanceKm: number | null;
  distanceSource: "patient_location" | "unknown";
  relevance: number;
  /** Plain-language reason for the specialty match. */
  matchReason: string;
  availabilityState: AvailabilityState;
  openNow: boolean;
  /** Human text such as "Mon–Sat 10:00–14:00, 17:00–20:00". */
  timingsText: string;
  nextSlots: Slot[];
  onLeaveUntil: string | null;
  score: number;
  rating: { average: number | null; count: number };
  directionsUrl: string | null;
}

export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason: string;
  /** Patient-approved symptom summary shared with this doctor only. Empty when not shared. */
  sharedSummary: string;
  createdAt: string;
  updatedAt: string;
}

/** Appointment as shown to a patient (joins the doctor). */
export interface PatientAppointmentView extends Appointment {
  doctorName: string;
  specialty: string;
  clinicName: string;
  clinicAddress: string;
  reviewed: boolean;
}

/** Appointment as shown to a doctor (joins the patient, minimal fields). */
export interface DoctorAppointmentView extends Appointment {
  patientName: string;
  patientAge: number | null;
  patientGender: string;
  patientPhoneVerified: boolean;
}

export type ReviewStatus = "published" | "flagged" | "removed";

export interface PublicReview {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
  /** Always "Verified visit": we never expose the patient's identity. */
  badge: "verified_visit";
  status: ReviewStatus;
  doctorResponse: string;
  moderationNote: string;
}

export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
