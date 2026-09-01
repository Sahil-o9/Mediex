export interface Patient {
  patientId: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
  email?: string;
  abhaId?: string;
  password: string;
  language: 'hi' | 'en';
  consent: boolean;
  createdAt: string;
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
