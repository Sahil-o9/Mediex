import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Clock } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';

export default function ComingSoonPage() {
  const navigate = useNavigate();
  const { patient } = useAuth();

  return (
    <AnimatedBackground>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <Logo size="sm" />
          <button
            onClick={() => navigate('/patient/home')}
            className="flex items-center gap-1.5 rounded-full bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 backdrop-blur-sm transition-colors hover:bg-white/80"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-medical-100 to-medical-200 shadow-lg shadow-medical-200/40"
            >
              <Sparkles size={48} className="text-medical-600" strokeWidth={2} />
            </motion.div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-medical-50 px-4 py-1.5 text-sm font-semibold text-medical-700">
              <Clock size={14} />
              Coming Soon
            </div>
            <h1 className="text-3xl font-bold text-slate-800 md:text-4xl">AI Health History Interview</h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-slate-500">
              Our AI-powered clinical interview will guide you through simple questions to build your
              complete medical history. This feature is under development.
            </p>
            {patient && (
              <p className="mt-6 text-sm text-slate-400">
                Logged in as {patient.fullName} ({patient.patientId})
              </p>
            )}
          </motion.div>
        </main>
      </div>
    </AnimatedBackground>
  );
}
