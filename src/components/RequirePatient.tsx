import type { ReactNode } from "react";
import { Navigate } from "@/lib/router";
import { useAuth } from "@/context/AuthContext";
import type { Patient } from "@/types";

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-medical-200 border-t-medical-600" />
    </div>
  );
}

export function RequirePatient({ children }: { children: (patient: Patient) => ReactNode }) {
  const { ready, patient } = useAuth();
  if (!ready) return <Loading />;
  if (!patient) return <Navigate to="/patient/auth" replace />;
  return <>{children(patient)}</>;
}

export function RequireDoctor({ children }: { children: ReactNode }) {
  const { ready, doctor } = useAuth();
  if (!ready) return <Loading />;
  if (!doctor) return <Navigate to="/doctor/login" replace />;
  return <>{children}</>;
}
