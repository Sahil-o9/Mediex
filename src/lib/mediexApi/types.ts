export type ApiRole = "patient" | "doctor";

export interface ApiUser {
  _id: string;
  name: string;
  fullName?: string;
  mobileNumber?: string;
  email?: string;
  role: ApiRole;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  specialty?: string;
  licenseNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: true;
  user: ApiUser;
  token: string;
}

export interface RegisterPayload {
  name?: string;
  fullName?: string;
  mobileNumber: string;
  email?: string;
  password: string;
  role?: ApiRole;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  specialty?: string;
  licenseNumber?: string;
}

export interface LoginPayload {
  mobileNumber: string;
  email?: string;
  password: string;
}

export interface MedicalRecord {
  _id: string;
  patient: string | ApiUser;
  doctor?: string | ApiUser;
  title: string;
  recordType: "consultation" | "lab_report" | "imaging" | "vaccination" | "surgery" | "other";
  diagnosis?: string;
  symptoms: string[];
  notes?: string;
  attachments: { fileName?: string; url?: string; mimeType?: string; uploadedAt?: string }[];
  recordDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  _id: string;
  patient: string | ApiUser;
  doctor?: string | ApiUser;
  doctorName?: string;
  specialty?: string;
  hospitalName?: string;
  date: string;
  time: string;
  reason?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface Prescription {
  _id: string;
  patient: string | ApiUser;
  doctor: string | ApiUser;
  appointment?: string;
  medicines: Medicine[];
  diagnosis?: string;
  notes?: string;
  issuedDate: string;
  createdAt: string;
  updatedAt: string;
}