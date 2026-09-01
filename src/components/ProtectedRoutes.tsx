import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedPatientRoute({ children }: { children: ReactNode }) {
  const { patient } = useAuth();
  if (!patient) return <Navigate to="/patient/auth" replace />;
  return <>{children}</>;
}

export function ProtectedDoctorRoute({ children }: { children: ReactNode }) {
  const { doctor } = useAuth();
  if (!doctor) return <Navigate to="/doctor/login" replace />;
  return <>{children}</>;
}
