import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import type { Patient, Doctor } from "@/types";
import { setToken as setApiToken } from "@/lib/mediexApi/client";

interface AuthContextValue {
  ready: boolean;
  patient: Patient | null;
  doctor: Doctor | null;
  loginPatient: (mobile: string, password: string) => { success: boolean; error?: string };
  registerPatient: (data: Omit<Patient, "patientId" | "createdAt">) => {
    success: boolean;
    error?: string;
    patientId?: string;
  };
  /** Adopts a patient session that was created via the real Express/Mongoose backend. */
  setApiPatientSession: (patient: Patient) => void;
  updatePatient: (updates: Partial<Patient>) => void;
  logoutPatient: () => void;
  loginDoctor: (doctorId: string, password: string) => { success: boolean; error?: string };
  logoutDoctor: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PATIENTS_KEY = "mediex_patients";
const PATIENT_SESSION_KEY = "mediex_patient_session";
const API_PATIENT_SESSION_KEY = "mediex_api_patient_session";
const DOCTOR_SESSION_KEY = "mediex_doctor_session";

const DEMO_DOCTORS: Doctor[] = [
  { doctorId: "doctor001", password: "Doctor@123", name: "Dr. Anita Sharma" },
];

function loadPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(PATIENTS_KEY);
    return raw ? (JSON.parse(raw) as Patient[]) : [];
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
  const [ready, setReady] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    try {
      const apiSession = localStorage.getItem(API_PATIENT_SESSION_KEY);
      if (apiSession) {
        setPatient(JSON.parse(apiSession) as Patient);
      } else {
        const pSession = localStorage.getItem(PATIENT_SESSION_KEY);
        if (pSession) {
          const found = loadPatients().find((p) => p.patientId === pSession);
          if (found) setPatient(found);
        }
      }
      const dSession = localStorage.getItem(DOCTOR_SESSION_KEY);
      if (dSession) {
        const found = DEMO_DOCTORS.find((d) => d.doctorId === dSession);
        if (found) setDoctor(found);
      }
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);

  const loginPatient = useCallback((mobile: string, password: string) => {
    const found = loadPatients().find((p) => p.mobileNumber === mobile.trim());
    if (!found) return { success: false, error: "no-account" };
    if (found.password !== password) return { success: false, error: "wrong-password" };
    localStorage.setItem(PATIENT_SESSION_KEY, found.patientId);
    setPatient(found);
    return { success: true };
  }, []);

  const registerPatient = useCallback((data: Omit<Patient, "patientId" | "createdAt">) => {
    const patients = loadPatients();
    if (patients.find((p) => p.mobileNumber === data.mobileNumber.trim())) {
      return { success: false, error: "mobile-exists" };
    }
    const patientId = generatePatientId();
    const newPatient: Patient = { ...data, patientId, createdAt: new Date().toISOString() };
    patients.push(newPatient);
    savePatients(patients);
    localStorage.setItem(PATIENT_SESSION_KEY, patientId);
    setPatient(newPatient);
    return { success: true, patientId };
  }, []);

  /** Called by PatientAuthPage after a real /api/auth/register or /api/auth/login succeeds. */
  const setApiPatientSession = useCallback((p: Patient) => {
    localStorage.removeItem(PATIENT_SESSION_KEY); // clear any stale legacy-mock session
    localStorage.setItem(API_PATIENT_SESSION_KEY, JSON.stringify(p));
    setPatient(p);
  }, []);

  const updatePatient = useCallback((updates: Partial<Patient>) => {
    setPatient((current) => {
      if (!current) return current;
      const merged = { ...current, ...updates };
      if (localStorage.getItem(API_PATIENT_SESSION_KEY)) {
        localStorage.setItem(API_PATIENT_SESSION_KEY, JSON.stringify(merged));
      } else {
        const patients = loadPatients().map((p) => (p.patientId === merged.patientId ? merged : p));
        savePatients(patients);
      }
      return merged;
    });
  }, []);

  const logoutPatient = useCallback(() => {
    localStorage.removeItem(PATIENT_SESSION_KEY);
    localStorage.removeItem(API_PATIENT_SESSION_KEY);
    setApiToken(null); // clear the real backend JWT too
    setPatient(null);
  }, []);

  const loginDoctor = useCallback((doctorId: string, password: string) => {
    const found = DEMO_DOCTORS.find((d) => d.doctorId === doctorId.trim());
    if (!found) return { success: false, error: "doctor-not-found" };
    if (found.password !== password) return { success: false, error: "wrong-password" };
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
      value={{
        ready,
        patient,
        doctor,
        loginPatient,
        registerPatient,
        setApiPatientSession,
        updatePatient,
        logoutPatient,
        loginDoctor,
        logoutDoctor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
