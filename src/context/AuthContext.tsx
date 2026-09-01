import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Patient, Doctor } from '@/types';

interface AuthContextValue {
  patient: Patient | null;
  doctor: Doctor | null;
  loginPatient: (mobile: string, password: string) => { success: boolean; error?: string };
  registerPatient: (data: Omit<Patient, 'patientId' | 'createdAt'>) => { success: boolean; error?: string; patientId?: string };
  logoutPatient: () => void;
  loginDoctor: (doctorId: string, password: string) => { success: boolean; error?: string };
  logoutDoctor: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PATIENTS_KEY = 'mediex_patients';
const PATIENT_SESSION_KEY = 'mediex_patient_session';
const DOCTOR_SESSION_KEY = 'mediex_doctor_session';

const DEMO_DOCTORS: Doctor[] = [
  { doctorId: 'doctor001', password: 'Doctor@123', name: 'Dr. Anita Sharma' },
];

function loadPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(PATIENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePatients(patients: Patient[]) {
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

function generatePatientId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `MK-${num}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const pSession = localStorage.getItem(PATIENT_SESSION_KEY);
    if (pSession) {
      const patients = loadPatients();
      const found = patients.find((p) => p.patientId === pSession);
      if (found) setPatient(found);
    }
    const dSession = localStorage.getItem(DOCTOR_SESSION_KEY);
    if (dSession) {
      const found = DEMO_DOCTORS.find((d) => d.doctorId === dSession);
      if (found) setDoctor(found);
    }
  }, []);

  const loginPatient = useCallback((mobile: string, password: string) => {
    const patients = loadPatients();
    const found = patients.find((p) => p.mobileNumber === mobile.trim());
    if (!found) return { success: false, error: 'No account found with this mobile number. Please register first.' };
    if (found.password !== password) return { success: false, error: 'Incorrect password. Please try again.' };
    localStorage.setItem(PATIENT_SESSION_KEY, found.patientId);
    setPatient(found);
    return { success: true };
  }, []);

  const registerPatient = useCallback((data: Omit<Patient, 'patientId' | 'createdAt'>) => {
    const patients = loadPatients();
    if (patients.find((p) => p.mobileNumber === data.mobileNumber.trim())) {
      return { success: false, error: 'An account with this mobile number already exists. Please login instead.' };
    }
    const patientId = generatePatientId();
    const newPatient: Patient = {
      ...data,
      patientId,
      createdAt: new Date().toISOString(),
    };
    patients.push(newPatient);
    savePatients(patients);
    localStorage.setItem(PATIENT_SESSION_KEY, patientId);
    setPatient(newPatient);
    return { success: true, patientId };
  }, []);

  const logoutPatient = useCallback(() => {
    localStorage.removeItem(PATIENT_SESSION_KEY);
    setPatient(null);
  }, []);

  const loginDoctor = useCallback((doctorId: string, password: string) => {
    const found = DEMO_DOCTORS.find((d) => d.doctorId === doctorId.trim());
    if (!found) return { success: false, error: 'Doctor ID not found. Please check and try again.' };
    if (found.password !== password) return { success: false, error: 'Incorrect password. Please try again.' };
    localStorage.setItem(DOCTOR_SESSION_KEY, found.doctorId);
    setDoctor(found);
    return { success: true };
  }, []);

  const logoutDoctor = useCallback(() => {
    localStorage.removeItem(DOCTOR_SESSION_KEY);
    setDoctor(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ patient, doctor, loginPatient, registerPatient, logoutPatient, loginDoctor, logoutDoctor }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
