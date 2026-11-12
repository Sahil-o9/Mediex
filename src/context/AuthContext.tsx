import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/mediex/http";
import type { Doctor, Patient } from "@/types";

/**
 * Authentication state for the browser. The real session is an HttpOnly cookie
 * set by the server; this context only mirrors "who am I" from /api/auth/session.
 * No passwords or tokens are stored in localStorage.
 */

export interface ServerConfig {
  configured: boolean;
  storage: "memory" | "supabase";
  otpMode: "demo" | "unconfigured";
  demoAccounts: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  /** Set on successful patient registration. */
  patientId?: string;
}

interface RegisterPatientInput {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  language?: string;
  consent: boolean;
}

interface AuthContextValue {
  ready: boolean;
  patient: Patient | null;
  doctor: Doctor | null;
  admin: { id: string; name: string } | null;
  verificationStatus: string | null;
  config: ServerConfig | null;
  refresh: () => Promise<void>;
  loginPatient: (phone: string, password: string) => Promise<AuthResult>;
  registerPatient: (input: RegisterPatientInput) => Promise<AuthResult>;
  updatePatient: (updates: Partial<Patient>) => void;
  logoutPatient: () => Promise<void>;
  loginDoctor: (
    id: string,
    password: string,
  ) => Promise<AuthResult & { role?: "doctor" | "admin" | undefined }>;
  registerDoctor: (input: {
    fullName: string;
    email: string;
    password: string;
    qualifications: string;
    registrationNumber: string;
    registrationCouncil: string;
  }) => Promise<AuthResult>;
  logoutDoctor: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface SessionPayload extends ServerConfig {
  role: "patient" | "doctor" | "admin" | null;
  patient?: Patient;
  doctor?: { doctorId: string; name: string; profileId: string | null; staff: boolean };
  admin?: { id: string; name: string };
  verificationStatus?: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [admin, setAdmin] = useState<{ id: string; name: string } | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [config, setConfig] = useState<ServerConfig | null>(null);

  const refresh = useCallback(async () => {
    const r = await apiFetch<SessionPayload>("/api/auth/session");
    const d = r.data;
    setConfig(
      d
        ? {
            configured: d.configured,
            storage: d.storage,
            otpMode: d.otpMode,
            demoAccounts: d.demoAccounts,
          }
        : null,
    );
    setPatient(d?.role === "patient" && d.patient ? d.patient : null);
    setDoctor(
      d?.role === "doctor" && d.doctor
        ? {
            doctorId: d.doctor.doctorId,
            name: d.doctor.name,
            role: "doctor",
            staff: d.doctor.staff,
            profileId: d.doctor.profileId,
          }
        : null,
    );
    setAdmin(d?.role === "admin" && d.admin ? d.admin : null);
    setVerificationStatus(d?.role === "doctor" ? (d.verificationStatus ?? null) : null);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginPatient = useCallback(
    async (phone: string, password: string): Promise<AuthResult> => {
      const r = await apiFetch("/api/auth/patient", {
        method: "POST",
        body: { action: "login", phone, password },
      });
      if (!r.ok) return { success: false, error: r.error ?? "unknown" };
      await refresh();
      return { success: true };
    },
    [refresh],
  );

  const registerPatient = useCallback(
    async (input: RegisterPatientInput): Promise<AuthResult> => {
      const r = await apiFetch<{ patient: { patientId: string } }>("/api/auth/patient", {
        method: "POST",
        body: { action: "register", ...input },
      });
      if (!r.ok) return { success: false, error: r.error ?? "unknown" };
      await refresh();
      return { success: true, patientId: r.data?.patient.patientId ?? "" };
    },
    [refresh],
  );

  const updatePatient = useCallback((updates: Partial<Patient>) => {
    // Local display-only update (profile page). Server-side profile editing is not exposed yet.
    setPatient((cur) => (cur ? { ...cur, ...updates } : cur));
  }, []);

  const logoutPatient = useCallback(async () => {
    await apiFetch("/api/auth/session", { method: "DELETE" });
    setPatient(null);
  }, []);

  const loginDoctor = useCallback(
    async (id: string, password: string) => {
      const r = await apiFetch<{ doctor: { role: "doctor" | "admin" } }>("/api/auth/doctor", {
        method: "POST",
        body: { action: "login", doctorId: id, password },
      });
      if (!r.ok) return { success: false, error: r.error ?? "unknown" };
      await refresh();
      return { success: true, role: r.data?.doctor.role };
    },
    [refresh],
  );

  const registerDoctor = useCallback(
    async (input: Parameters<AuthContextValue["registerDoctor"]>[0]): Promise<AuthResult> => {
      const r = await apiFetch("/api/auth/doctor", {
        method: "POST",
        body: { action: "register", ...input },
      });
      if (!r.ok) return { success: false, error: r.error ?? "unknown" };
      await refresh();
      return { success: true };
    },
    [refresh],
  );

  const logoutDoctor = useCallback(async () => {
    await apiFetch("/api/auth/session", { method: "DELETE" });
    setDoctor(null);
    setAdmin(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      patient,
      doctor,
      admin,
      verificationStatus,
      config,
      refresh,
      loginPatient,
      registerPatient,
      updatePatient,
      logoutPatient,
      loginDoctor,
      registerDoctor,
      logoutDoctor,
    }),
    [
      ready,
      patient,
      doctor,
      admin,
      verificationStatus,
      config,
      refresh,
      loginPatient,
      registerPatient,
      updatePatient,
      logoutPatient,
      loginDoctor,
      registerDoctor,
      logoutDoctor,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
