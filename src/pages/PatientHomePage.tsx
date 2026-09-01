import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut, ClipboardList, User, Calendar, Phone, Mail, Languages } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';

export default function PatientHomePage() {
  const navigate = useNavigate();
  const { patient, logoutPatient } = useAuth();

  if (!patient) return null;

  const handleLogout = () => {
    logoutPatient();
    navigate('/');
  };

  const infoItems = [
    { icon: <Calendar size={18} />, label: 'Date of Birth', value: patient.dateOfBirth },
    { icon: <User size={18} />, label: 'Gender', value: patient.gender },
    { icon: <Phone size={18} />, label: 'Mobile', value: patient.mobileNumber },
    { icon: <Languages size={18} />, label: 'Language', value: patient.language === 'hi' ? 'हिन्दी' : 'English' },
  ].filter((item) => item.value);

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Logo size="sm" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 backdrop-blur-sm transition-colors hover:bg-white/80"
          >
            <LogOut size={16} />
            Logout
          </button>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl"
          >
            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-medical-500 to-medical-700 shadow-lg shadow-medical-500/30">
                <User size={32} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 md:text-4xl">
                Welcome, {patient.fullName.split(' ')[0]}
              </h1>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-medical-100 px-4 py-1.5 text-sm font-semibold text-medical-700">
                Patient ID: {patient.patientId}
              </div>
            </div>

            {/* Profile summary */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              {infoItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-50 text-medical-600">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Main CTA card */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/patient/history')}
              className="group relative flex w-full flex-col items-start gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-medical-600 to-medical-800 p-8 text-left shadow-xl shadow-medical-500/30 md:p-10"
            >
              <div className="absolute right-0 top-0 h-40 w-40 translate-x-16 -translate-y-16 rounded-full bg-white/10" />
              <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-12 translate-y-12 rounded-full bg-white/5" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <ClipboardList size={32} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="relative">
                <h2 className="text-2xl font-bold text-white md:text-3xl">Complete Your Health History</h2>
                <p className="mt-2 text-base text-medical-100 md:text-lg">
                  Answer a few simple questions before meeting your doctor.
                </p>
              </div>
              <div className="relative mt-2 flex items-center gap-2 font-semibold text-white transition-transform group-hover:gap-3">
                Start Health History
                <ArrowRight size={20} />
              </div>
            </motion.button>
          </motion.div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
