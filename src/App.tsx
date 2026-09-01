import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedPatientRoute, ProtectedDoctorRoute } from '@/components/ProtectedRoutes';
import WelcomePage from '@/pages/WelcomePage';
import PatientAuthPage from '@/pages/PatientAuthPage';
import PatientHomePage from '@/pages/PatientHomePage';
import ComingSoonPage from '@/pages/ComingSoonPage';
import DoctorLoginPage from '@/pages/DoctorLoginPage';
import DoctorDashboardPage from '@/pages/DoctorDashboardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/patient/auth" element={<PatientAuthPage />} />
          <Route
            path="/patient/home"
            element={
              <ProtectedPatientRoute>
                <PatientHomePage />
              </ProtectedPatientRoute>
            }
          />
          <Route
            path="/patient/history"
            element={
              <ProtectedPatientRoute>
                <ComingSoonPage />
              </ProtectedPatientRoute>
            }
          />
          <Route path="/doctor/login" element={<DoctorLoginPage />} />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedDoctorRoute>
                <DoctorDashboardPage />
              </ProtectedDoctorRoute>
            }
          />
          <Route path="*" element={<WelcomePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
